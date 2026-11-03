import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_user_by_id(session: AsyncSession, user_id: str) -> User | None:
    result = await session.scalars(select(User).where(User.id == user_id))
    return result.first()


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.scalars(select(User).where(User.email == email.lower().strip()))
    return result.first()


async def get_user_by_google_id(session: AsyncSession, google_id: str) -> User | None:
    result = await session.scalars(select(User).where(User.google_id == google_id))
    return result.first()


async def create_user(
    session: AsyncSession,
    email: str,
    hashed_password: str | None = None,
    full_name: str | None = None,
    avatar_url: str | None = None,
    google_id: str | None = None,
) -> User:
    new_user = User(
        id=str(uuid.uuid4()),
        email=email.lower().strip(),
        hashed_password=hashed_password,
        full_name=full_name,
        avatar_url=avatar_url,
        google_id=google_id,
        is_active=True,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user


async def link_google_account(
    session: AsyncSession,
    user_id: str,
    google_id: str,
    avatar_url: str | None = None,
) -> User | None:
    user = await get_user_by_id(session, user_id)
    if not user:
        return None
    user.google_id = google_id
    if avatar_url and not user.avatar_url:
        user.avatar_url = avatar_url
    await session.commit()
    await session.refresh(user)
    return user

