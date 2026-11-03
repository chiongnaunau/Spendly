from decimal import Decimal
from datetime import date

from sqlalchemy import delete as sql_delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.models.wallet import Wallet
from app.schemas.wallet import WalletCreate, WalletOut, WalletUpdate, WalletsSummaryResponse


async def list_wallets_with_balances(session: AsyncSession, user_id: str) -> WalletsSummaryResponse:
    # 1. Fetch all wallets
    result = await session.scalars(
        select(Wallet).where(Wallet.user_id == user_id).order_by(Wallet.is_default.desc(), Wallet.id.asc())
    )
    wallets = list(result)

    # Auto-seed default wallet if user has none
    if not wallets:
        default_wallet = Wallet(
            user_id=user_id,
            name="Tiền mặt",
            type="CASH",
            initial_balance=Decimal("0.00"),
            currency="VND",
            color="#10b981",
            icon="wallet",
            is_default=True,
        )
        session.add(default_wallet)
        await session.commit()
        await session.refresh(default_wallet)
        wallets = [default_wallet]

    # 2. Aggregate transactions by wallet and type
    agg_result = await session.execute(
        select(
            Transaction.wallet_id,
            Transaction.type,
            func.sum(Transaction.total_price),
        )
        .where(Transaction.user_id == user_id, Transaction.wallet_id.isnot(None))
        .group_by(Transaction.wallet_id, Transaction.type)
    )

    wallet_income: dict[int, Decimal] = {}
    wallet_expense: dict[int, Decimal] = {}

    for w_id, tx_type, total in agg_result:
        val = total or Decimal("0.00")
        if tx_type == "INCOME":
            wallet_income[w_id] = val
        else:
            wallet_expense[w_id] = val

    out_list: list[WalletOut] = []
    total_balance = Decimal("0.00")

    for w in wallets:
        inc = wallet_income.get(w.id, Decimal("0.00"))
        exp = wallet_expense.get(w.id, Decimal("0.00"))
        cur_bal = (w.initial_balance or Decimal("0.00")) + inc - exp
        total_balance += cur_bal

        out_list.append(
            WalletOut(
                id=w.id,
                name=w.name,
                type=w.type,
                initial_balance=w.initial_balance,
                current_balance=cur_bal,
                total_income=inc,
                total_expense=exp,
                currency=w.currency,
                color=w.color,
                icon=w.icon,
                is_default=w.is_default,
            )
        )

    return WalletsSummaryResponse(total_balance=total_balance, wallets=out_list)


async def get_wallet_by_id(session: AsyncSession, user_id: str, wallet_id: int) -> Wallet | None:
    return await session.scalar(
        select(Wallet).where(Wallet.user_id == user_id, Wallet.id == wallet_id)
    )


async def create_wallet(session: AsyncSession, user_id: str, data: WalletCreate) -> Wallet:
    if data.is_default:
        # Clear existing default
        await session.execute(
            update(Wallet).where(Wallet.user_id == user_id).values(is_default=False)
        )

    wallet = Wallet(
        user_id=user_id,
        name=data.name,
        type=data.type,
        initial_balance=data.initial_balance,
        currency=data.currency,
        color=data.color,
        icon=data.icon,
        is_default=data.is_default,
    )
    session.add(wallet)
    await session.commit()
    await session.refresh(wallet)
    return wallet


async def update_wallet(
    session: AsyncSession, user_id: str, wallet_id: int, data: WalletUpdate
) -> Wallet | None:
    wallet = await get_wallet_by_id(session, user_id, wallet_id)
    if not wallet:
        return None

    if data.is_default:
        await session.execute(
            update(Wallet).where(Wallet.user_id == user_id).values(is_default=False)
        )

    if data.name is not None:
        wallet.name = data.name
    if data.initial_balance is not None:
        wallet.initial_balance = data.initial_balance
    if data.color is not None:
        wallet.color = data.color
    if data.icon is not None:
        wallet.icon = data.icon
    if data.is_default is not None:
        wallet.is_default = data.is_default

    await session.commit()
    await session.refresh(wallet)
    return wallet


async def delete_wallet(session: AsyncSession, user_id: str, wallet_id: int) -> bool:
    # Unlink transactions
    await session.execute(
        update(Transaction).where(Transaction.user_id == user_id, Transaction.wallet_id == wallet_id).values(wallet_id=None)
    )
    result = await session.execute(
        sql_delete(Wallet).where(Wallet.user_id == user_id, Wallet.id == wallet_id)
    )
    await session.commit()
    return (result.rowcount or 0) > 0


async def transfer_money(
    session: AsyncSession,
    user_id: str,
    from_wallet_id: int,
    to_wallet_id: int,
    amount: Decimal,
    note: str | None = None,
) -> bool:
    from_w = await get_wallet_by_id(session, user_id, from_wallet_id)
    to_w = await get_wallet_by_id(session, user_id, to_wallet_id)
    if not from_w or not to_w or from_wallet_id == to_wallet_id:
        return False

    today = date.today()
    transfer_note = f" (Ghi chú: {note})" if note else ""

    # Expense from source wallet
    tx_out = Transaction(
        user_id=user_id,
        store_name=f"Chuyển sang: {to_w.name}",
        item_name=f"Chuyển tiền đến ví {to_w.name}{transfer_note}",
        total_price=amount,
        category="khac",
        type="EXPENSE",
        wallet_id=from_wallet_id,
        transaction_date=today,
    )
    # Income to destination wallet
    tx_in = Transaction(
        user_id=user_id,
        store_name=f"Nhận từ: {from_w.name}",
        item_name=f"Nhận tiền từ ví {from_w.name}{transfer_note}",
        total_price=amount,
        category="khac",
        type="INCOME",
        wallet_id=to_wallet_id,
        transaction_date=today,
    )

    session.add(tx_out)
    session.add(tx_in)
    await session.commit()
    return True
