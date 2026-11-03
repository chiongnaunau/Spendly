from datetime import date
from decimal import Decimal

from sqlalchemy import delete as sql_delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.schemas.transactions import ReceiptItem, TransactionCreate


async def recent(session: AsyncSession, user_id: str, limit: int = 20) -> list[Transaction]:
    result = await session.scalars(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
        .limit(limit)
    )
    return list(result)


async def totals_by_category(session: AsyncSession, user_id: str, start: date, end: date) -> dict[str, Decimal]:
    rows = await session.execute(
        select(Transaction.category, func.sum(Transaction.total_price))
        .where(
            Transaction.user_id == user_id,
            Transaction.type == "EXPENSE",
            Transaction.transaction_date >= start,
            Transaction.transaction_date < end,
        )
        .group_by(Transaction.category)
    )
    return {category: (total or Decimal("0")) for category, total in rows}


async def totals_by_type(session: AsyncSession, user_id: str, start: date, end: date) -> dict[str, Decimal]:
    rows = await session.execute(
        select(Transaction.type, func.sum(Transaction.total_price))
        .where(
            Transaction.user_id == user_id,
            Transaction.transaction_date >= start,
            Transaction.transaction_date < end,
        )
        .group_by(Transaction.type)
    )
    return {t: (total or Decimal("0")) for t, total in rows}


async def create(session: AsyncSession, user_id: str, data: TransactionCreate) -> Transaction:
    tx = Transaction(
        user_id=user_id,
        store_name=data.store_name,
        item_name=data.item_name,
        quantity=data.quantity,
        unit_price=data.unit_price,
        total_price=data.total_price,
        category=data.category,
        type=data.type,
        wallet_id=data.wallet_id,
        transaction_date=data.transaction_date,
    )
    session.add(tx)
    await session.commit()
    await session.refresh(tx)
    return tx


async def create_batch(
    session: AsyncSession,
    user_id: str,
    store_name: str | None,
    transaction_date: date,
    items: list[ReceiptItem],
    ocr_confidence: float | None = None,
) -> list[Transaction]:
    tx_list: list[Transaction] = []
    for item in items:
        tx = Transaction(
            user_id=user_id,
            store_name=store_name,
            item_name=item.item_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price,
            category=item.category,
            type="EXPENSE",
            transaction_date=transaction_date,
            ocr_confidence=ocr_confidence,
        )
        session.add(tx)
        tx_list.append(tx)

    await session.commit()
    for tx in tx_list:
        await session.refresh(tx)
    return tx_list


async def delete(session: AsyncSession, user_id: str, tx_id: int) -> bool:
    result = await session.execute(
        sql_delete(Transaction).where(Transaction.user_id == user_id, Transaction.id == tx_id)
    )
    await session.commit()
    return (result.rowcount or 0) > 0
