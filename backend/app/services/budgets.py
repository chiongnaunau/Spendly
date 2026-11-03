from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.budgets import get_budget, upsert_budget
from app.repositories.transactions import totals_by_category
from app.schemas.budget import BudgetResponse


def get_month_range(month_str: str) -> tuple[date, date]:
    start = date.fromisoformat(f"{month_str}-01")
    # First day of next month
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return start, end


async def calculate_budget_status(
    session: AsyncSession, user_id: str, month: str
) -> BudgetResponse:
    start, end = get_month_range(month)
    by_category = await totals_by_category(session, user_id, start, end)
    total_spent = sum(by_category.values(), Decimal("0.00"))

    budget = await get_budget(session, user_id, month)

    today = date.today()
    if today.year == start.year and today.month == start.month:
        last_day = (end - timedelta(days=1)).day
        days_remaining = max(1, last_day - today.day + 1)
    elif today > end:
        days_remaining = 0
    else:
        days_remaining = (end - start).days

    if not budget:
        return BudgetResponse(
            month=month,
            budget_amount=None,
            spent_amount=total_spent,
            remaining_amount=None,
            pct_used=None,
            safe_to_spend_per_day=None,
            is_over_budget=False,
            days_remaining=days_remaining,
        )

    remaining = budget.amount - total_spent
    pct_used = (
        round(float((total_spent / budget.amount) * 100), 1)
        if budget.amount > 0
        else 0.0
    )
    is_over = total_spent > budget.amount

    if days_remaining > 0 and remaining > 0:
        safe_per_day = round(remaining / Decimal(days_remaining), 2)
    else:
        safe_per_day = Decimal("0.00")

    return BudgetResponse(
        month=month,
        budget_amount=budget.amount,
        spent_amount=total_spent,
        remaining_amount=remaining,
        pct_used=pct_used,
        safe_to_spend_per_day=safe_per_day,
        is_over_budget=is_over,
        days_remaining=days_remaining,
    )


async def save_monthly_budget(
    session: AsyncSession, user_id: str, month: str, amount: Decimal
) -> BudgetResponse:
    await upsert_budget(session, user_id, month, amount)
    return await calculate_budget_status(session, user_id, month)
