from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    store_name: Mapped[str | None] = mapped_column(String(255))
    item_name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(12, 3))
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    total_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    category: Mapped[str] = mapped_column(String(80), index=True)
    type: Mapped[str] = mapped_column(String(20), default="EXPENSE", server_default="EXPENSE", index=True)
    wallet_id: Mapped[int | None] = mapped_column(index=True, nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date, index=True)
    raw_ocr_text: Mapped[str | None] = mapped_column(Text)
    ocr_confidence: Mapped[float | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

