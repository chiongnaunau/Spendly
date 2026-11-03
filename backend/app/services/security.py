import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import httpx
import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.settings import settings

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except jwt.PyJWTError:
        return None


async def verify_google_credential(credential: str) -> dict[str, Any]:
    """Verify Google ID Token credential and extract user profile.

    Supports both official google-auth library and Google TokenInfo endpoint as fallback.
    """
    # 1. Try google.oauth2.id_token library
    try:
        request = google_requests.Request()
        client_id = settings.google_client_id or None
        # If client_id is configured, verify audience; otherwise verify signature
        id_info = id_token.verify_oauth2_token(credential, request, audience=client_id)
        return {
            "google_id": id_info.get("sub"),
            "email": id_info.get("email"),
            "full_name": id_info.get("name"),
            "avatar_url": id_info.get("picture"),
            "email_verified": id_info.get("email_verified", False),
        }
    except Exception as e:
        logger.warning("Local google.oauth2 verification failed, trying tokeninfo endpoint: %s", e)

    # 2. Fallback to Google TokenInfo REST API
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": credential},
        )
        if res.status_code != 200:
            raise ValueError("Token xác thực Google không hợp lệ hoặc đã hết hạn.")
        info = res.json()
        if "error" in info:
            raise ValueError(f"Lỗi xác thực Google: {info.get('error_description', 'Token không hợp lệ')}")

        return {
            "google_id": info.get("sub"),
            "email": info.get("email"),
            "full_name": info.get("name"),
            "avatar_url": info.get("picture"),
            "email_verified": info.get("email_verified") in (True, "true"),
        }

