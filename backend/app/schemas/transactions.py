from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    store_name: str | None = None
    item_name: str
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    total_price: Decimal
    category: str
    type: str = "EXPENSE"
    wallet_id: int | None = None
    transaction_date: date


class TransactionCreate(BaseModel):
    store_name: str | None = None
    item_name: str = Field(min_length=1, max_length=255)
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    total_price: Decimal = Field(ge=0)
    category: str = "khác"
    type: str = Field(default="EXPENSE", pattern=r"^(EXPENSE|INCOME)$")
    wallet_id: int | None = None
    transaction_date: date


class ReceiptItem(BaseModel):
    item_name: str = Field(min_length=1, max_length=255)
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    total_price: Decimal = Field(ge=0)
    category: str = "khác"


class ReceiptConfirmRequest(BaseModel):
    store_name: str | None = None
    transaction_date: date
    items: list[ReceiptItem] = Field(min_length=1)
    grand_total: Decimal = Field(ge=0)
    ocr_confidence: float | None = None


class ReceiptConfirmResponse(BaseModel):
    saved_count: int
    message: str
    transactions: list[TransactionOut]
