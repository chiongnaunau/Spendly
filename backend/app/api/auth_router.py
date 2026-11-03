from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Principal, require_principal
from app.core.db import get_session
from app.models.user import User
from app.repositories.users import (
    create_user,
    get_user_by_email,
    get_user_by_google_id,
    get_user_by_id,
    link_google_account,
)
from app.repositories.wallets import create_wallet
from app.schemas.auth import (
    AuthResponse,
    GoogleAuthRequest,
    GoogleLinkRequest,
    LoginRequest,
    RegisterRequest,
    UserOut,
)
from app.schemas.wallet import WalletCreate
from app.services.security import (
    create_access_token,
    hash_password,
    verify_google_credential,
    verify_password,
)

auth_router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        has_google_linked=bool(user.google_id),
        created_at=user.created_at,
    )


@auth_router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_session)) -> AuthResponse:
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.",
        )

    hashed_pw = hash_password(body.password)
    user = await create_user(
        db,
        email=body.email,
        hashed_password=hashed_pw,
        full_name=body.full_name,
    )

    # Automatically initialize default cash wallet for new user
    await create_wallet(
        db,
        user.id,
        WalletCreate(
            name="Tiền mặt",
            type="CASH",
            initial_balance=0,
            currency="VND",
            color="#10b981",
            icon="wallet",
            is_default=True,
        ),
    )

    token = create_access_token({"sub": user.id, "email": user.email})
    return AuthResponse(access_token=token, user=_to_user_out(user))


@auth_router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_session)) -> AuthResponse:
    user = await get_user_by_email(db, body.email)
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản này đã bị tạm khóa.",
        )

    token = create_access_token({"sub": user.id, "email": user.email})
    return AuthResponse(access_token=token, user=_to_user_out(user))


@auth_router.post("/google", response_model=AuthResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_session)) -> AuthResponse:
    try:
        profile = await verify_google_credential(body.credential)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Xác thực Google thất bại: {exc}",
        ) from exc

    google_id = profile["google_id"]
    email = profile["email"]

    # 1. Existing user with this Google ID
    user = await get_user_by_google_id(db, google_id)
    if user:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị tạm khóa.")
        token = create_access_token({"sub": user.id, "email": user.email})
        return AuthResponse(access_token=token, user=_to_user_out(user))

    # 2. Existing user with matching email -> link Google account
    user = await get_user_by_email(db, email)
    if user:
        user = await link_google_account(db, user.id, google_id, profile.get("avatar_url"))
        token = create_access_token({"sub": user.id, "email": user.email})
        return AuthResponse(access_token=token, user=_to_user_out(user))

    # 3. New user signup via Google
    user = await create_user(
        db,
        email=email,
        full_name=profile.get("full_name"),
        avatar_url=profile.get("avatar_url"),
        google_id=google_id,
    )

    # Initialize default cash wallet
    await create_wallet(
        db,
        user.id,
        WalletCreate(
            name="Tiền mặt",
            type="CASH",
            initial_balance=0,
            currency="VND",
            color="#10b981",
            icon="wallet",
            is_default=True,
        ),
    )

    token = create_access_token({"sub": user.id, "email": user.email})
    return AuthResponse(access_token=token, user=_to_user_out(user))


@auth_router.post("/google/link", response_model=UserOut)
async def link_google(
    body: GoogleLinkRequest,
    current_user: Principal = Depends(require_principal),
    db: AsyncSession = Depends(get_session),
) -> UserOut:
    try:
        profile = await verify_google_credential(body.credential)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Xác thực Google thất bại: {exc}",
        ) from exc

    google_id = profile["google_id"]
    existing_owner = await get_user_by_google_id(db, google_id)
    if existing_owner and existing_owner.id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tài khoản Google này đã được liên kết với một người dùng Spendly khác.",
        )

    updated_user = await link_google_account(
        db, current_user.user_id, google_id, profile.get("avatar_url")
    )
    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại.")

    return _to_user_out(updated_user)


@auth_router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    current_user: Principal = Depends(require_principal),
    db: AsyncSession = Depends(get_session),
) -> UserOut:
    user = await get_user_by_id(db, current_user.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại.")
    return _to_user_out(user)

