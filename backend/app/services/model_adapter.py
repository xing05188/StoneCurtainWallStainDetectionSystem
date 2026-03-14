from __future__ import annotations

import io
import os
import time
from dataclasses import dataclass

import numpy as np
from PIL import Image
from ultralytics import YOLO

from app.core.config import settings


@dataclass(frozen=True)
class ModelResultRegion:
    label: str
    confidence: float
    severity: str
    bbox: tuple[float, float, float, float]


@dataclass(frozen=True)
class ModelResult:
    stain_detected: bool
    stain_type: str | None
    severity_level: int | None
    affected_area_percentage: float | None
    summary: str
    runtime_ms: int
    overall_cleanliness: float
    regions: list[ModelResultRegion]
    processed_image_bytes: bytes | None
    processed_image_content_type: str | None


_model: YOLO | None = None


def _load_model() -> YOLO:
    global _model
    if _model is not None:
        return _model

    model_path = os.path.abspath(settings.yolo_model_path)
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"YOLO model file not found: {model_path}. "
            "Please place best.pt under backend/models or set YOLO_MODEL_PATH."
        )

    _model = YOLO(model_path)
    return _model


def _severity_from_confidence(confidence: float) -> str:
    if confidence >= 0.8:
        return "high"
    if confidence >= 0.55:
        return "medium"
    return "low"


def detect_image_sync(image_bytes: bytes, content_type: str) -> ModelResult:
    _ = content_type
    started_at = time.perf_counter()

    model = _load_model()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    prediction = model.predict(
        source=image,
        conf=settings.yolo_confidence_threshold,
        verbose=False
    )[0]

    names_map = prediction.names or {}
    width = max(float(image.width), 1.0)
    height = max(float(image.height), 1.0)

    regions: list[ModelResultRegion] = []
    affected_ratio_sum = 0.0
    best_confidence = -1.0
    best_label: str | None = None

    boxes = prediction.boxes
    if boxes is not None and len(boxes) > 0:
        xyxy_list = boxes.xyxy.cpu().tolist()
        conf_list = boxes.conf.cpu().tolist()
        cls_list = boxes.cls.cpu().tolist()

        for xyxy, confidence, cls_idx in zip(xyxy_list, conf_list, cls_list, strict=False):
            x1_px, y1_px, x2_px, y2_px = [float(value) for value in xyxy]
            x1 = max(0.0, min(1.0, x1_px / width))
            y1 = max(0.0, min(1.0, y1_px / height))
            x2 = max(0.0, min(1.0, x2_px / width))
            y2 = max(0.0, min(1.0, y2_px / height))

            area_ratio = max(0.0, x2 - x1) * max(0.0, y2 - y1)
            affected_ratio_sum += area_ratio

            class_index = int(cls_idx)
            label = str(names_map.get(class_index, f"class_{class_index}"))
            conf_value = float(confidence)

            if conf_value > best_confidence:
                best_confidence = conf_value
                best_label = label

            regions.append(
                ModelResultRegion(
                    label=label,
                    confidence=round(conf_value, 4),
                    severity=_severity_from_confidence(conf_value),
                    bbox=(round(x1, 5), round(y1, 5), round(x2, 5), round(y2, 5))
                )
            )

    mask_ratio = 0.0
    masks = prediction.masks
    if masks is not None and getattr(masks, "data", None) is not None and len(masks.data) > 0:
        union_mask = masks.data.any(dim=0)
        mask_ratio = float(union_mask.float().mean().item())

    stain_detected = len(regions) > 0
    base_ratio = mask_ratio if mask_ratio > 0 else min(affected_ratio_sum, 1.0)
    affected_area = round(base_ratio * 100, 2)
    overall_cleanliness = round(max(0.0, 100 - affected_area), 2)
    runtime_ms = int((time.perf_counter() - started_at) * 1000)

    plotted = prediction.plot()
    processed_image_bytes: bytes | None = None
    if plotted is not None:
        rgb_plot = plotted[..., ::-1] if isinstance(plotted, np.ndarray) and plotted.ndim == 3 else plotted
        plotted_image = Image.fromarray(rgb_plot)
        buffer = io.BytesIO()
        plotted_image.save(buffer, format="PNG")
        processed_image_bytes = buffer.getvalue()

    if stain_detected:
        stain_type = best_label
        severity_level = 5 if affected_area >= 45 else 4 if affected_area >= 30 else 3 if affected_area >= 15 else 2
        summary = f"检测到 {len(regions)} 处疑似污渍，主要类型为 {stain_type}，污渍占比约 {affected_area}% 。"
    else:
        stain_type = None
        severity_level = None
        summary = "未检测到明显污渍。"

    return ModelResult(
        stain_detected=stain_detected,
        stain_type=stain_type,
        severity_level=severity_level,
        affected_area_percentage=affected_area,
        summary=summary,
        runtime_ms=runtime_ms,
        overall_cleanliness=overall_cleanliness,
        regions=regions,
        processed_image_bytes=processed_image_bytes,
        processed_image_content_type="image/png" if processed_image_bytes else None
    )
