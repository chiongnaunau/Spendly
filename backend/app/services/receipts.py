"""Receipt parsing via Gemini Vision multimodal API and confirmation pipeline."""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import date

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.gemini import vision_extract
from app.models.transaction import Transaction
from app.repositories.transactions import create_batch
from app.schemas.transactions import ReceiptConfirmRequest
from app.services.embeddings import embed_and_store_transaction

logger = logging.getLogger(__name__)

RECEIPT_PROMPT = """
Analyze this receipt image carefully. Extract all information and return ONLY valid JSON matching this exact schema:
{
  "store_name": string or null,
  "transaction_date": "YYYY-MM-DD",
  "items": [
    {
      "item_name": string,
      "quantity": number or null,
      "unit_price": number or null,
      "total_price": number,
      "category": string
    }
  ],
  "grand_total": number,
  "ocr_confidence": number between 0 and 1
}

Category must be one of: an_uong, di_chuyen, mua_sam, y_te, giai_tri, hoa_don, giao_duc, khac
If date is unclear use today's date. All prices in the original currency (numbers only, no currency symbols).
Return ONLY the JSON object, no markdown, no explanation.
"""


async def parse_receipt(image: UploadFile) -> dict:
    image_bytes = await image.read()
    mime_type = image.content_type or "image/jpeg"

    try:
        raw_json = await vision_extract(image_bytes, mime_type, RECEIPT_PROMPT)
        # Strip markdown fences if Gemini wraps them despite the instruction
        cleaned = raw_json.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(cleaned)

        # Ensure required fields and sensible defaults
        today_str = date.today().isoformat()
        return {
            "store_name": data.get("store_name"),
            "transaction_date": data.get("transaction_date", today_str),
            "items": data.get("items", []),
            "grand_total": float(data.get("grand_total", 0)),
            "ocr_confidence": float(data.get("ocr_confidence", 0.8)),
            "needs_review": True,
            "status": "parsed",
        }
    except Exception as exc:
        logger.warning("Receipt parsing failed: %s", exc)
        return {
            "store_name": None,
            "transaction_date": date.today().isoformat(),
            "items": [],
            "grand_total": 0,
            "ocr_confidence": None,
            "needs_review": True,
            "status": "error",
            "error": str(exc),
        }


async def confirm_receipt(
    session: AsyncSession,
    user_id: str,
    payload: ReceiptConfirmRequest,
) -> list[Transaction]:
    """Persist receipt items to database and index them into Qdrant vector store."""
    tx_list = await create_batch(
        session=session,
        user_id=user_id,
        store_name=payload.store_name,
        transaction_date=payload.transaction_date,
        items=payload.items,
        ocr_confidence=payload.ocr_confidence,
    )

    # Trigger vector indexing in Qdrant for RAG search
    for tx in tx_list:
        try:
            asyncio.create_task(
                embed_and_store_transaction(
                    tx_id=tx.id,
                    user_id=user_id,
                    item_name=tx.item_name,
                    store_name=tx.store_name,
                    category=tx.category,
                    total_price=tx.total_price,
                    transaction_date=tx.transaction_date,
                )
            )
        except Exception as exc:
            logger.warning("Failed to schedule vector indexing for transaction %s: %s", tx.id, exc)

    return tx_list