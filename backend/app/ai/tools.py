"""MCP tool definitions and executors for the LangGraph chat agent."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.transactions import recent, totals_by_category


# --- Tool declarations using Python functions (GenAI SDK auto-converts to clean schemas) ---

def query_db(query_type: str, month: str = "") -> str:
    """Query the user's real spending or budget data from the database.
    Use this for any question about amounts, totals, categories, transaction history, or budget status.
    NEVER fabricate financial numbers; always call this tool instead.

    Args:
        query_type: Type of data to retrieve: 'monthly_total', 'category_breakdown', 'recent_transactions', 'budget_status', or 'wallets_status'.
        month: Month in YYYY-MM format (e.g. '2026-10'), required for monthly_total, category_breakdown, and budget_status.
    """
    return ""



def search_memory(query: str, top_k: int = 5) -> str:
    """Semantically search past transactions from vector memory.
    Use for questions like 'what do I usually buy at X?' or 'find transactions similar to Y'.

    Args:
        query: Natural language description of what to search for.
        top_k: Number of similar results to return (default 5).
    """
    return ""


ALL_TOOLS = [query_db, search_memory]


# --- Tool executors ---

async def execute_query_db(
    args: dict,
    session: AsyncSession,
    user_id: str,
) -> str:
    query_type = args.get("query_type", "recent_transactions")
    month = args.get("month")

    if query_type == "recent_transactions":
        txs = await recent(session, user_id, limit=10)
        if not txs:
            return "No recent transactions found."
        lines = [
            f"- {tx.item_name} | {tx.category} | {tx.total_price:,.0f}₫ | {tx.transaction_date}"
            for tx in txs
        ]
        return "Recent transactions:\n" + "\n".join(lines)

    if query_type in {"wallets_status", "wallets"}:
        from app.repositories.wallets import list_wallets_with_balances
        ws = await list_wallets_with_balances(session, user_id)
        lines = [
            f"- {w.name} ({w.type}): Số dư {w.current_balance:,.0f}₫"
            for w in ws.wallets
        ]
        return f"Danh sách các ví hiện tại (Tổng tài sản: {ws.total_balance:,.0f}₫):\n" + "\n".join(lines)


    if query_type == "budget_status":
        from app.services.budgets import calculate_budget_status
        m = month or date.today().strftime("%Y-%m")
        b = await calculate_budget_status(session, user_id, m)
        if b.budget_amount is None:
            return f"Chưa cài đặt ngân sách cho tháng {m}. Tổng đã chi tiêu: {b.spent_amount:,.0f}₫."
        status_txt = "ĐÃ VƯỢT NGÂN SÁCH" if b.is_over_budget else "Trong hạn mức"
        return (
            f"Trạng thái ngân sách tháng {m} ({status_txt}):\n"
            f"- Hạn mức ngân sách: {b.budget_amount:,.0f}₫\n"
            f"- Đã chi: {b.spent_amount:,.0f}₫ ({b.pct_used}%)\n"
            f"- Còn lại: {b.remaining_amount:,.0f}₫\n"
            f"- Số ngày còn lại trong tháng: {b.days_remaining} ngày\n"
            f"- Hạn mức an toàn mỗi ngày: {b.safe_to_spend_per_day:,.0f}₫/ngày"
        )

    if not month:
        month = date.today().strftime("%Y-%m")

    try:
        year, month_num = (int(p) for p in month.split("-"))
        start = date(year, month_num, 1)
        end = date(year + (month_num == 12), month_num % 12 + 1, 1)
    except Exception:
        now = date.today()
        month = now.strftime("%Y-%m")
        start = date(now.year, now.month, 1)
        end = date(now.year + (now.month == 12), now.month % 12 + 1, 1)

    by_cat = await totals_by_category(session, user_id, start, end)
    total = sum(by_cat.values(), Decimal("0"))

    if query_type == "monthly_total":
        from app.services.stats import monthly_stats
        s = await monthly_stats(session, user_id, month)
        savings_text = f"{s['savings_rate_pct']}%" if s['savings_rate_pct'] is not None else "Chưa có thu nhập"
        return (
            f"Báo cáo tài chính tháng {month}:\n"
            f"- Tổng thu nhập: {s['total_income']:,.0f}₫\n"
            f"- Tổng chi tiêu: {s['total']:,.0f}₫\n"
            f"- Dòng tiền ròng (Thu nhập - Chi tiêu): {s['net_cashflow']:,.0f}₫\n"
            f"- Tỷ lệ tiết kiệm: {savings_text}"
        )

    if not by_cat:
        return f"No spending data for {month}."
    lines = [f"- {cat}: {amt:,.0f}₫" for cat, amt in sorted(by_cat.items())]
    return f"Spending breakdown for {month} (total {total:,.0f}₫):\n" + "\n".join(lines)


async def execute_search_memory(
    args: dict,
    user_id: str,
) -> str:
    from app.ai.gemini import embed_text
    from app.core.qdrant import search_similar

    query = args.get("query", "")
    top_k = int(args.get("top_k", 5))

    try:
        vector = await embed_text(query)
        results = await search_similar(user_id, vector, top_k=top_k)
    except Exception:
        return "Memory search unavailable (Qdrant may not be running)."

    if not results:
        return "No similar transactions found in vector memory."

    lines = [
        f"- {r['item_name']} at {r.get('store_name', 'unknown')} | "
        f"{r['category']} | {r['total_price']:,.0f}₫ | {r['transaction_date']} "
        f"(similarity: {r['score']:.2f})"
        for r in results
    ]
    return "Similar transactions:\n" + "\n".join(lines)