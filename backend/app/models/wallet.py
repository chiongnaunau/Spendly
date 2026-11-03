from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(30), default="CASH", server_default="CASH")  # CASH, BANK, CREDIT_CARD, E_WALLET, OTHER
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0.00"), server_default="0.00")
    currency: Mapped[str] = mapped_column(String(10), default="VND", server_default="VND")
    color: Mapped[str] = mapped_column(String(30), default="#6366f1", server_default="#6366f1")
    icon: Mapped[str] = mapped_column(String(50), default="wallet", server_default="wallet")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
