from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.transactions import totals_by_category, totals_by_type


async def monthly_stats(session: AsyncSession, user_id: str, month: str) -> dict:
    year, month_number = (int(part) for part in month.split("-", maxsplit=1))
    start = date(year, month_number, 1)
    end = date(year + (month_number == 12), month_number % 12 + 1, 1)
    previous_start = date(year - (month_number == 1), (month_number - 2) % 12 + 1, 1)

    current_cat = await totals_by_category(session, user_id, start, end)
    current_types = await totals_by_type(session, user_id, start, end)
    previous_cat = await totals_by_category(session, user_id, previous_start, start)

    total_spent = current_types.get("EXPENSE", sum(current_cat.values(), Decimal("0.00")))
    total_income = current_types.get("INCOME", Decimal("0.00"))
    previous_spent = sum(previous_cat.values(), Decimal("0.00"))

    net_cashflow = total_income - total_spent
    savings_rate = (
        round(float((net_cashflow / total_income) * 100), 1)
        if total_income > 0
        else None
    )

    delta = (
        None
        if previous_spent == 0
        else float((total_spent - previous_spent) * 100 / previous_spent)
    )

    return {
        "month": month,
        "total": total_spent,
        "total_income": total_income,
        "net_cashflow": net_cashflow,
        "savings_rate_pct": savings_rate,
        "by_category": current_cat,
        "compare_last_month_pct": delta,
    }
