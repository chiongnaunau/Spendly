from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget import Budget


async def get_budget(session: AsyncSession, user_id: str, month: str) -> Budget | None:
    result = await session.scalars(
        select(Budget).where(Budget.user_id == user_id, Budget.month == month)
    )
    return result.first()


async def upsert_budget(
    session: AsyncSession, user_id: str, month: str, amount: Decimal
) -> Budget:
    budget = await get_budget(session, user_id, month)
    if budget:
        budget.amount = amount
    else:
        budget = Budget(user_id=user_id, month=month, amount=amount)
        session.add(budget)
    await session.commit()
    await session.refresh(budget)
    return budget
