from decimal import Decimal
from pydantic import BaseModel, Field


class BudgetSetRequest(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$", description="Month in YYYY-MM format")
    amount: Decimal = Field(gt=0, description="Monthly budget amount")


class BudgetResponse(BaseModel):
    month: str
    budget_amount: Decimal | None = None
    spent_amount: Decimal = Decimal("0.00")
    remaining_amount: Decimal | None = None
    pct_used: float | None = None
    safe_to_spend_per_day: Decimal | None = None
    is_over_budget: bool = False
    days_remaining: int = 0
