import asyncio
from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Principal, require_principal
from app.core.db import get_session
from app.repositories.transactions import create, delete, recent
from app.repositories.wallets import (
    create_wallet,
    delete_wallet,
    list_wallets_with_balances,
    transfer_money,
    update_wallet,
)
from app.schemas.budget import BudgetResponse, BudgetSetRequest
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.insights import InsightsResponse
from app.schemas.natural_input import NaturalInputRequest, ParsedExpenseResponse
from app.schemas.stats import StatsResponse
from app.schemas.transactions import (
    ReceiptConfirmRequest,
    ReceiptConfirmResponse,
    TransactionCreate,
    TransactionOut,
)
from app.schemas.wallet import (
    WalletCreate,
    WalletOut,
    WalletTransferRequest,
    WalletUpdate,
    WalletsSummaryResponse,
)
from app.services.budgets import calculate_budget_status, save_monthly_budget
from app.services.chat import answer
from app.services.embeddings import embed_and_store_transaction
from app.services.insights import generate_proactive_insights
from app.services.natural_input import parse_natural_language_input
from app.services.receipts import confirm_receipt, parse_receipt
from app.services.stats import monthly_stats


router = APIRouter()
Db = Annotated[AsyncSession, Depends(get_session)]
CurrentUser = Annotated[Principal, Depends(require_principal)]


def _validate_month(month: str) -> None:
    try:
        date.fromisoformat(f"{month}-01")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="month must use YYYY-MM") from exc
    if len(month) != 7:
        raise HTTPException(status_code=422, detail="month must use YYYY-MM")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "Spendly API"}


@router.get("/transactions/recent", response_model=list[TransactionOut])
async def recent_transactions(db: Db, user: CurrentUser) -> list:
    return await recent(db, user.user_id)


@router.post("/transactions", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def create_transaction(body: TransactionCreate, db: Db, user: CurrentUser) -> TransactionOut:
    tx = await create(db, user.user_id, body)
    try:
        asyncio.create_task(
            embed_and_store_transaction(
                tx_id=tx.id,
                user_id=user.user_id,
                item_name=tx.item_name,
                store_name=tx.store_name,
                category=tx.category,
                total_price=tx.total_price,
                transaction_date=tx.transaction_date,
            )
        )
    except Exception:
        pass
    return tx


@router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: int, db: Db, user: CurrentUser) -> dict:
    success = await delete(db, user.user_id, tx_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"ok": True, "id": tx_id}


@router.get("/stats/{month}", response_model=StatsResponse)
async def get_stats(month: str, db: Db, user: CurrentUser) -> dict:
    _validate_month(month)
    return await monthly_stats(db, user.user_id, month)


@router.get("/budgets/{month}", response_model=BudgetResponse)
async def get_budget(month: str, db: Db, user: CurrentUser) -> BudgetResponse:
    _validate_month(month)
    return await calculate_budget_status(db, user.user_id, month)


@router.post("/budgets", response_model=BudgetResponse)
async def set_budget(body: BudgetSetRequest, db: Db, user: CurrentUser) -> BudgetResponse:
    return await save_monthly_budget(db, user.user_id, body.month, body.amount)


@router.get("/insights/{month}", response_model=InsightsResponse)
async def get_insights(month: str, db: Db, user: CurrentUser) -> InsightsResponse:
    _validate_month(month)
    return await generate_proactive_insights(db, user.user_id, month)


@router.post("/receipts/parse")
async def upload_receipt(image: UploadFile = File(...), _: Principal = Depends(require_principal)) -> dict:
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image")
    return await parse_receipt(image)


@router.post("/receipts/confirm", response_model=ReceiptConfirmResponse)
async def confirm_receipt_endpoint(
    body: ReceiptConfirmRequest,
    db: Db,
    user: CurrentUser,
) -> ReceiptConfirmResponse:
    if not body.items:
        raise HTTPException(status_code=422, detail="Receipt contains no items to save")

    tx_list = await confirm_receipt(db, user.user_id, body)
    return ReceiptConfirmResponse(
        saved_count=len(tx_list),
        message=f"Đã lưu thành công {len(tx_list)} giao dịch vào hệ thống.",
        transactions=tx_list,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, db: Db, user: CurrentUser) -> dict:
    history_dicts = [{"role": m.role, "content": m.content} for m in body.history]
    return await answer(body.message, user.user_id, session=db, history=history_dicts)


@router.post("/natural-input/parse", response_model=ParsedExpenseResponse)
async def parse_natural_input_endpoint(
    body: NaturalInputRequest,
    _: CurrentUser,
) -> ParsedExpenseResponse:
    return await parse_natural_language_input(body.text)


# --- Wallet Endpoints ---

@router.get("/wallets", response_model=WalletsSummaryResponse)
async def get_wallets(db: Db, user: CurrentUser) -> WalletsSummaryResponse:
    return await list_wallets_with_balances(db, user.user_id)


@router.post("/wallets", response_model=WalletOut, status_code=status.HTTP_201_CREATED)
async def create_wallet_endpoint(body: WalletCreate, db: Db, user: CurrentUser) -> WalletOut:
    w = await create_wallet(db, user.user_id, body)
    return WalletOut(
        id=w.id,
        name=w.name,
        type=w.type,
        initial_balance=w.initial_balance,
        current_balance=w.initial_balance,
        total_income=Decimal("0.00"),
        total_expense=Decimal("0.00"),
        currency=w.currency,
        color=w.color,
        icon=w.icon,
        is_default=w.is_default,
    )


@router.put("/wallets/{wallet_id}", response_model=WalletOut)
async def update_wallet_endpoint(
    wallet_id: int, body: WalletUpdate, db: Db, user: CurrentUser
) -> WalletOut:
    w = await update_wallet(db, user.user_id, wallet_id, body)
    if not w:
        raise HTTPException(status_code=404, detail="Wallet not found")
    summary = await list_wallets_with_balances(db, user.user_id)
    for item in summary.wallets:
        if item.id == wallet_id:
            return item
    raise HTTPException(status_code=404, detail="Wallet not found")


@router.delete("/wallets/{wallet_id}")
async def delete_wallet_endpoint(wallet_id: int, db: Db, user: CurrentUser) -> dict:
    success = await delete_wallet(db, user.user_id, wallet_id)
    if not success:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return {"ok": True, "id": wallet_id}


@router.post("/wallets/transfer")
async def transfer_endpoint(body: WalletTransferRequest, db: Db, user: CurrentUser) -> dict:
    success = await transfer_money(
        db, user.user_id, body.from_wallet_id, body.to_wallet_id, body.amount, body.note
    )
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Transfer failed. Make sure source and destination wallets exist and are different.",
        )
    return {"ok": True, "message": "Chuyển tiền giữa các ví thành công."}

