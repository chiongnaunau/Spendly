import secrets
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.settings import settings
from app.repositories.users import get_user_by_id
from app.services.security import decode_access_token


@dataclass(frozen=True)
class Principal:
    user_id: str
    email: str = ""
    full_name: str | None = None
    avatar_url: str | None = None


async def require_principal(
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_session),
) -> Principal:
    # 1. Bearer JWT Token (Standard User Auth)
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        payload = decode_access_token(token)
        if not payload or not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = str(payload["sub"])
        user = await get_user_by_id(db, user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản không tồn tại hoặc đã bị khóa",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return Principal(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
        )

    # 2. X-API-Key fallback for internal services or development
    if settings.app_api_key and x_api_key and secrets.compare_digest(x_api_key, settings.app_api_key):
        return Principal(
            user_id=settings.dev_user_id,
            email="dev@spendly.local",
            full_name="Developer",
            avatar_url=None,
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Yêu cầu xác thực tài khoản. Vui lòng đăng nhập.",
        headers={"WWW-Authenticate": "Bearer"},
    )
