"""Chat service: routes to LangGraph MCP agent."""
from __future__ import annotations

import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.graph import run_agent
from app.core.settings import settings

logger = logging.getLogger(__name__)


async def answer(
    message: str,
    user_id: str,
    session: AsyncSession | None = None,
    history: list[dict] | None = None,
) -> dict:
    if not settings.gemini_api_key:
        return {
            "reply": "Trợ lý AI chưa được kích hoạt vì thiếu cấu hình GEMINI_API_KEY. Vui lòng thêm khóa vào tệp .env.",
            "tool_used": "none",
            "latency_ms": 0,
        }

    if session is None:
        return {
            "reply": "Không thể kết nối cơ sở dữ liệu để tra cứu thông tin chi tiêu.",
            "tool_used": "none",
            "latency_ms": 0,
        }

    try:
        return await run_agent(message, user_id, session, history=history)
    except Exception as exc:
        logger.exception("Error in chat service: %s", exc)
        return {
            "reply": f"Hệ thống AI gặp sự cố khi xử lý câu hỏi: {exc}",
            "tool_used": "error",
            "latency_ms": 0,
        }