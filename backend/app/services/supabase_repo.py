from __future__ import annotations

from datetime import datetime
import uuid

from fastapi import HTTPException
from supabase import Client, create_client

from app.core.config import settings


class SupabaseRepository:
    def __init__(self) -> None:
        key = settings.supabase_service_role_key or settings.supabase_anon_key
        if not settings.supabase_url or not key:
            raise RuntimeError("Supabase configuration is missing")
        self.client: Client = create_client(settings.supabase_url, key)

    def upload_image(self, user_id: str, image_bytes: bytes, content_type: str) -> str:
        suffix = ".jpg" if content_type.endswith("jpeg") else ".png"
        now = datetime.now()
        ym = f"{now.year:04d}{now.month:02d}"
        path = (
            f"u/{user_id}/o/{ym}/{uuid.uuid4().hex[:16]}{suffix}"
        )

        storage = self.client.storage.from_(settings.supabase_bucket)
        storage.upload(path=path, file=image_bytes, file_options={"content-type": content_type})
        return path

    def upload_processed_image(self, user_id: str, task_id: str, image_bytes: bytes, content_type: str) -> str:
        suffix = ".png" if content_type.endswith("png") else ".jpg"
        now = datetime.now()
        ym = f"{now.year:04d}{now.month:02d}"
        path = (
            f"u/{user_id}/p/{ym}/{task_id}-{uuid.uuid4().hex[:10]}{suffix}"
        )

        storage = self.client.storage.from_(settings.supabase_bucket)
        storage.upload(path=path, file=image_bytes, file_options={"content-type": content_type})
        return path

    def download_image(self, path: str) -> bytes:
        storage = self.client.storage.from_(settings.supabase_bucket)
        data = storage.download(path)
        if not data:
            raise RuntimeError("Failed to download image from storage")
        return data

    def create_signed_image_url(self, path: str, expires_in: int | None = None) -> str | None:
        if not path:
            return None

        storage = self.client.storage.from_(settings.supabase_bucket)
        expire = expires_in or settings.signed_url_expires_seconds

        try:
            response = storage.create_signed_url(path=path, expires_in=expire)
        except TypeError:
            # Compatibility fallback for older method signature.
            response = storage.create_signed_url(path, expire)
        except Exception:  # noqa: BLE001
            return None

        if isinstance(response, str):
            return response
        if hasattr(response, "signed_url"):
            return getattr(response, "signed_url")
        if hasattr(response, "signedURL"):
            return getattr(response, "signedURL")
        if hasattr(response, "model_dump"):
            dumped = response.model_dump()
            return dumped.get("signedURL") or dumped.get("signedUrl") or dumped.get("signed_url")
        if isinstance(response, dict):
            return response.get("signedURL") or response.get("signedUrl") or response.get("signed_url")
        return None

    def create_detection(self, user_id: str, payload: dict, image_path: str, file_size: int, mime_type: str) -> str:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        task_insert = self.client.table("inspection_tasks").insert({
            "user_id": user_id,
            "building_name": payload["building_name"],
            "location_floor": payload.get("location_floor"),
            "location_section": payload.get("location_section"),
            "description": payload.get("description"),
            "status": "pending",
            "created_at": now,
            "updated_at": now
        }).execute()

        if not task_insert.data:
            raise RuntimeError("Failed to create task")
        task_id = str(task_insert.data[0]["id"])

        self.client.table("task_images").insert({
            "task_id": task_id,
            "user_id": user_id,
            "image_name": payload.get("image_name"),
            "original_image_path": image_path,
            "mime_type": mime_type,
            "file_size": file_size,
            "created_at": now
        }).execute()

        self.client.table("detection_results").insert({
            "task_id": task_id,
            "user_id": user_id,
            "status": "pending",
            "created_at": now,
            "updated_at": now
        }).execute()

        return task_id

    def update_detection_processing(self, task_id: str) -> None:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.client.table("inspection_tasks").update({
            "status": "processing",
            "updated_at": now
        }).eq("id", task_id).execute()

        self.client.table("detection_results").update({
            "status": "processing",
            "updated_at": now
        }).eq("task_id", task_id).execute()

    def update_detection_done(self, task_id: str, result: dict) -> None:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        owner_res = self.client.table("inspection_tasks").select("user_id").eq("id", task_id).limit(1).execute()
        if not owner_res.data:
            raise HTTPException(status_code=404, detail="Task not found")
        user_id = owner_res.data[0]["user_id"]

        processed_image_path = None
        if result.get("processed_image_bytes") and result.get("processed_image_content_type"):
            processed_image_path = self.upload_processed_image(
                user_id=user_id,
                task_id=task_id,
                image_bytes=result["processed_image_bytes"],
                content_type=result["processed_image_content_type"]
            )

            self.client.table("task_images").update({
                "processed_image_path": processed_image_path
            }).eq("task_id", task_id).eq("user_id", user_id).execute()

        self.client.table("inspection_tasks").update({
            "status": "done",
            "summary": result["summary"],
            "stain_detected": result["stain_detected"],
            "stain_type": result["stain_type"],
            "affected_area_percentage": result["affected_area_percentage"],
            "updated_at": now
        }).eq("id", task_id).execute()

        self.client.table("detection_results").update({
            "status": "done",
            "summary": result["summary"],
            "metrics": {
                "runtimeMs": result["runtime_ms"],
                "overallCleanliness": result["overall_cleanliness"]
            },
            "processed_at": now,
            "updated_at": now
        }).eq("task_id", task_id).execute()

        self.client.table("result_regions").delete().eq("task_id", task_id).execute()
        if result["regions"]:
            self.client.table("result_regions").insert([
                {
                    "task_id": task_id,
                    "label": region["label"],
                    "confidence": region["confidence"],
                    "x1": region["bbox"][0],
                    "y1": region["bbox"][1],
                    "x2": region["bbox"][2],
                    "y2": region["bbox"][3]
                }
                for region in result["regions"]
            ]).execute()

    def update_detection_failed(self, task_id: str, error_message: str) -> None:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        self.client.table("inspection_tasks").update({
            "status": "failed",
            "error_message": error_message,
            "updated_at": now
        }).eq("id", task_id).execute()

        self.client.table("detection_results").update({
            "status": "failed",
            "error_message": error_message,
            "updated_at": now
        }).eq("task_id", task_id).execute()

    def get_task_detail(self, task_id: str, user_id: str) -> dict:
        task_res = self.client.table("inspection_tasks").select("*").eq("id", task_id).eq("user_id", user_id).limit(1).execute()
        if not task_res.data:
            raise HTTPException(status_code=404, detail="Task not found")

        task = task_res.data[0]

        image_res = self.client.table("task_images").select("image_name,original_image_path,processed_image_path").eq("task_id", task_id).eq("user_id", user_id).limit(1).execute()
        image_name = image_res.data[0].get("image_name") if image_res.data else None
        image_path = image_res.data[0]["original_image_path"] if image_res.data else None
        processed_image_path = image_res.data[0].get("processed_image_path") if image_res.data else None
        image_signed_url = None
        if image_path:
            try:
                image_signed_url = self.create_signed_image_url(image_path)
            except Exception:  # noqa: BLE001
                image_signed_url = None
        processed_image_signed_url = None
        if processed_image_path:
            try:
                processed_image_signed_url = self.create_signed_image_url(processed_image_path)
            except Exception:  # noqa: BLE001
                processed_image_signed_url = None

        result_res = self.client.table("detection_results").select("metrics").eq("task_id", task_id).eq("user_id", user_id).limit(1).execute()
        metrics = result_res.data[0]["metrics"] if result_res.data else None

        regions_res = self.client.table("result_regions").select("label, confidence, x1, y1, x2, y2").eq("task_id", task_id).execute()
        regions = [
            {
                "label": row["label"],
                "confidence": row["confidence"],
                "bbox": [row["x1"], row["y1"], row["x2"], row["y2"]]
            }
            for row in regions_res.data or []
        ]

        return {
            "id": task["id"],
            "userId": task["user_id"],
            "buildingName": task["building_name"],
            "locationFloor": task.get("location_floor"),
            "locationSection": task.get("location_section"),
            "description": task.get("description"),
            "status": task["status"],
            "createdAt": task["created_at"],
            "updatedAt": task["updated_at"],
            "imageName": image_name,
            "imagePath": image_path,
            "imageSignedUrl": image_signed_url,
            "processedImagePath": processed_image_path,
            "processedImageSignedUrl": processed_image_signed_url,
            "summary": task.get("summary"),
            "stainDetected": task.get("stain_detected"),
            "stainType": task.get("stain_type"),
            "affectedAreaPercentage": task.get("affected_area_percentage"),
            "regions": regions,
            "metrics": metrics,
            "errorMessage": task.get("error_message")
        }

    def get_task_image_info(self, task_id: str, user_id: str) -> tuple[str, str]:
        response = self.client.table("task_images").select("original_image_path,mime_type").eq("task_id", task_id).eq("user_id", user_id).limit(1).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Task image not found")

        image_path = response.data[0].get("original_image_path")
        mime_type = response.data[0].get("mime_type") or "image/jpeg"
        if not image_path:
            raise HTTPException(status_code=404, detail="Task image path is empty")

        return str(image_path), str(mime_type)

    def list_tasks(
        self,
        user_id: str,
        current_page: int,
        size: int,
        status: str | None,
        building_name: str | None,
        start_time: str | None,
        end_time: str | None
    ) -> dict:
        start = (current_page - 1) * size
        end = start + size - 1

        query = self.client.table("inspection_tasks").select(
            "id,user_id,building_name,location_floor,location_section,status,created_at,updated_at,summary,stain_detected,stain_type,affected_area_percentage,error_message",
            count="exact"
        ).eq("user_id", user_id)
        if status:
            query = query.eq("status", status)
        if building_name:
            query = query.ilike("building_name", f"%{building_name}%")
        if start_time:
            query = query.gte("created_at", start_time)
        if end_time:
            query = query.lte("created_at", end_time)

        response = query.order("created_at", desc=True).order("id", desc=True).range(start, end).execute()

        task_rows = response.data or []
        image_name_map: dict[str, str | None] = {}
        for row in task_rows:
            task_id = row["id"]
            try:
                image_row = self.client.table("task_images").select("image_name").eq("user_id", user_id).eq("task_id", task_id).order("id", desc=True).limit(1).execute()
                image_name_map[str(task_id)] = image_row.data[0].get("image_name") if image_row.data else None
            except Exception:  # noqa: BLE001
                # 兼容尚未迁移 image_name 列的环境
                image_name_map[str(task_id)] = None

        items = [
            {
                "id": task["id"],
                "userId": task["user_id"],
                "buildingName": task["building_name"],
                "locationFloor": task.get("location_floor"),
                "locationSection": task.get("location_section"),
                "description": None,
                "status": task["status"],
                "createdAt": task["created_at"],
                "updatedAt": task["updated_at"],
                "imageName": image_name_map.get(str(task["id"])),
                "imagePath": None,
                "imageSignedUrl": None,
                "processedImagePath": None,
                "processedImageSignedUrl": None,
                "summary": task.get("summary"),
                "stainDetected": task.get("stain_detected"),
                "stainType": task.get("stain_type"),
                "affectedAreaPercentage": task.get("affected_area_percentage"),
                "regions": [],
                "metrics": None,
                "errorMessage": task.get("error_message")
            }
            for task in task_rows
        ]
        return {
            "list": items,
            "total": response.count or 0
        }

    def reset_to_pending(self, task_id: str, user_id: str) -> None:
        task = self.get_task_detail(task_id, user_id)
        if task["status"] not in ("failed", "done"):
            return

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.client.table("inspection_tasks").update({
            "status": "pending",
            "error_message": None,
            "updated_at": now
        }).eq("id", task_id).eq("user_id", user_id).execute()

        self.client.table("detection_results").update({
            "status": "pending",
            "error_message": None,
            "updated_at": now
        }).eq("task_id", task_id).eq("user_id", user_id).execute()
