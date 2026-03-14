from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from supabase import create_client

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=True)


def _decode_local_jwt(token: str) -> str | None:
    try:
        if settings.supabase_jwt_secret:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        else:
            payload = jwt.decode(token, options={"verify_signature": False})
    except Exception:  # noqa: BLE001
        return None

    user_id = payload.get("sub")
    return str(user_id) if user_id else None


def _verify_with_supabase(token: str) -> str | None:
    if not settings.supabase_url or not settings.supabase_anon_key:
        return None

    try:
        client = create_client(settings.supabase_url, settings.supabase_anon_key)
        try:
            response = client.auth.get_user(token)
        except TypeError:
            # Compatibility fallback for different SDK signatures
            response = client.auth.get_user(jwt=token)

        user = getattr(response, "user", None)
        if not user:
            return None

        user_id = getattr(user, "id", None)
        return str(user_id) if user_id else None
    except Exception:  # noqa: BLE001
        return None


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    token = credentials.credentials

    user_id = _decode_local_jwt(token)
    if user_id:
        return user_id

    user_id = _verify_with_supabase(token)
    if user_id:
        return user_id

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
