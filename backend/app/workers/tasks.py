from __future__ import annotations

from app.services.model_adapter import InferenceMode, detect_image_sync
from app.services.supabase_repo import SupabaseRepository


def process_detection_task(task_id: str, image_bytes: bytes, content_type: str, mode: InferenceMode = "local") -> None:
    repo = SupabaseRepository()
    try:
        repo.update_detection_processing(task_id)
        model_result = detect_image_sync(image_bytes, content_type, mode)
        repo.update_detection_done(task_id, {
            "stain_detected": model_result.stain_detected,
            "stain_type": model_result.stain_type,
            "affected_area_percentage": model_result.affected_area_percentage,
            "summary": model_result.summary,
            "runtime_ms": model_result.runtime_ms,
            "overall_cleanliness": model_result.overall_cleanliness,
            "inference_mode": mode,
            "processed_image_bytes": model_result.processed_image_bytes,
            "processed_image_content_type": model_result.processed_image_content_type,
            "regions": [
                {
                    "label": item.label,
                    "confidence": item.confidence,
                    "bbox": item.bbox
                }
                for item in model_result.regions
            ]
        })
    except Exception as error:  # noqa: BLE001
        repo.update_detection_failed(task_id, str(error))


def process_detection_task_from_storage(task_id: str, storage_path: str, content_type: str, mode: InferenceMode = "local") -> None:
    repo = SupabaseRepository()
    try:
        image_bytes = repo.download_image(storage_path)
        process_detection_task(task_id, image_bytes, content_type, mode)
    except Exception as error:  # noqa: BLE001
        repo.update_detection_failed(task_id, str(error))
