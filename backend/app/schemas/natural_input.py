from datetime import date
from decimal import Decimal
from pydantic import BaseModel, Field


class NaturalInputRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class ParsedExpenseResponse(BaseModel):
    item_name: str
    total_price: Decimal
    category: str
    store_name: str | None = None
    type: str = Field(default="EXPENSE", pattern=r"^(EXPENSE|INCOME)$")
    transaction_date: date
    confidence: float = Field(default=0.9, ge=0, le=1)
    raw_text: str
