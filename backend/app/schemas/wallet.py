from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class WalletCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str = Field(default="CASH", pattern=r"^(CASH|BANK|CREDIT_CARD|E_WALLET|OTHER)$")
    initial_balance: Decimal = Field(default=Decimal("0.00"))
    currency: str = Field(default="VND", max_length=10)
    color: str = Field(default="#6366f1", max_length=30)
    icon: str = Field(default="wallet", max_length=50)
    is_default: bool = False


class WalletUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    initial_balance: Decimal | None = None
    color: str | None = None
    icon: str | None = None
    is_default: bool | None = None


class WalletOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    initial_balance: Decimal
    current_balance: Decimal
    total_income: Decimal = Decimal("0.00")
    total_expense: Decimal = Decimal("0.00")
    currency: str
    color: str
    icon: str
    is_default: bool


class WalletTransferRequest(BaseModel):
    from_wallet_id: int
    to_wallet_id: int
    amount: Decimal = Field(gt=0)
    note: str | None = None


class WalletsSummaryResponse(BaseModel):
    total_balance: Decimal
    wallets: list[WalletOut]
