"""Embedding service: convert transaction text to vectors and store in Qdrant."""
from __future__ import annotations

import logging
from decimal import Decimal
from datetime import date

from app.ai.gemini import embed_text
from app.core.qdrant import ensure_collection, upsert_transaction
from app.core.settings import settings

logger = logging.getLogger(__name__)


def _transaction_to_text(
    item_name: str,
    store_name: str | None,
    category: str,
    total_price: Decimal,
    transaction_date: date,
) -> str:
    store_part = f" at {store_name}" if store_name else ""
    return (
        f"{item_name}{store_part}, category {category}, "
        f"price {float(total_price):.0f}, date {transaction_date}"
    )


async def embed_and_store_transaction(
    tx_id: int,
    user_id: str,
    item_name: str,
    store_name: str | None,
    category: str,
    total_price: Decimal,
    transaction_date: date,
) -> None:
    if not settings.gemini_api_key:
        logger.debug("Skipping embedding: GEMINI_API_KEY not set.")
        return

    try:
        await ensure_collection()
        text = _transaction_to_text(item_name, store_name, category, total_price, transaction_date)
        vector = await embed_text(text)
        await upsert_transaction(
            tx_id=tx_id,
            user_id=user_id,
            item_name=item_name,
            store_name=store_name,
            category=category,
            total_price=total_price,
            transaction_date=transaction_date,
            vector=vector,
        )
        logger.debug("Embedded transaction %d into Qdrant.", tx_id)
    except Exception as exc:
        logger.warning("Failed to embed transaction %d: %s", tx_id, exc)