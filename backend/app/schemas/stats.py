from decimal import Decimal

from pydantic import BaseModel


class StatsResponse(BaseModel):
    month: str
    total: Decimal
    total_income: Decimal = Decimal("0.00")
    net_cashflow: Decimal = Decimal("0.00")
    savings_rate_pct: float | None = None
    by_category: dict[str, Decimal]
    compare_last_month_pct: float | None = None
