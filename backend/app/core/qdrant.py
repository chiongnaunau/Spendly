"""Qdrant vector store client: init, embed-and-upsert, semantic search."""
from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.core.settings import settings

logger = logging.getLogger(__name__)

VECTOR_SIZE = 3072  # gemini-embedding-001 output dimension

_client: AsyncQdrantClient | None = None


async def get_client() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key or None,
        )
    return _client


async def ensure_collection() -> None:
    client = await get_client()
    try:
        exists = await client.collection_exists(settings.qdrant_collection)
        if exists:
            info = await client.get_collection(settings.qdrant_collection)
            current_dim = getattr(info.config.params.vectors, "size", None)
            if current_dim and current_dim != VECTOR_SIZE:
                logger.info("Migrating Qdrant collection %s from dim %s to %s", settings.qdrant_collection, current_dim, VECTOR_SIZE)
                await client.delete_collection(settings.qdrant_collection)
                exists = False
        if not exists:
            await client.create_collection(
                collection_name=settings.qdrant_collection,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
    except Exception as exc:
        logger.warning("Qdrant collection check skipped (is Qdrant running?): %s", exc)


async def upsert_transaction(
    tx_id: int,
    user_id: str,
    item_name: str,
    store_name: str | None,
    category: str,
    total_price: Decimal,
    transaction_date: date,
    vector: list[float],
) -> None:
    client = await get_client()
    await client.upsert(
        collection_name=settings.qdrant_collection,
        points=[
            PointStruct(
                id=tx_id,
                vector=vector,
                payload={
                    "user_id": user_id,
                    "item_name": item_name,
                    "store_name": store_name,
                    "category": category,
                    "total_price": float(total_price),
                    "transaction_date": str(transaction_date),
                },
            )
        ],
    )


async def search_similar(
    user_id: str,
    query_vector: list[float],
    top_k: int = 5,
) -> list[dict]:
    client = await get_client()
    try:
        res = await client.query_points(
            collection_name=settings.qdrant_collection,
            query=query_vector,
            query_filter=Filter(
                must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
            ),
            limit=top_k,
            with_payload=True,
        )
        return [
            {**point.payload, "score": point.score}
            for point in res.points
            if point.payload
        ]
    except Exception as exc:
        logger.warning("Error searching in Qdrant: %s", exc)
        return []