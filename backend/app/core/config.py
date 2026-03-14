from __future__ import annotations

import os
from pathlib import Path
from dataclasses import dataclass

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Stone Curtain Wall Stain Detection API")
    app_env: str = os.getenv("APP_ENV", "development")
    cors_origins: tuple[str, ...] = tuple(
        value.strip() for value in os.getenv("CORS_ORIGINS", "http://localhost:80").split(",") if value.strip()
    )

    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_jwt_secret: str = os.getenv("SUPABASE_JWT_SECRET", "")
    supabase_bucket: str = os.getenv("SUPABASE_BUCKET", "stain-images")
    signed_url_expires_seconds: int = int(os.getenv("SIGNED_URL_EXPIRES_SECONDS", "3600"))

    sync_size_threshold_bytes: int = int(os.getenv("SYNC_SIZE_THRESHOLD_BYTES", "2097152"))
    yolo_model_path: str = os.getenv("YOLO_MODEL_PATH", "models/best.pt")
    yolo_confidence_threshold: float = float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", "0.25"))


settings = Settings()
