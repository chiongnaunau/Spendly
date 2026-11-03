"""LangGraph agent graph for MCP-style chat orchestration."""
from __future__ import annotations

import logging
import time
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.gemini import get_chat_model
from app.ai.tools import (
    ALL_TOOLS,
    execute_query_db,
    execute_search_memory,
)

logger = logging.getLogger(__name__)


class AgentState(TypedDict, total=False):
    user_id: str
    session: Any  # AsyncSession
    messages: list[dict]
    tool_results: list[str]
    final_reply: str
    tool_used: str
    latency_ms: int
    _pending_tool_calls: list[Any]


def _build_system_prompt() -> str:
    from datetime import date
    today = date.today().isoformat()
    current_month = today[:7]
    return (
        "You are Spendly, an intelligent personal finance assistant.\n"
        f"Today's date is {today}. The current month is {current_month}.\n"
        "You have access to the user's real spending and budget data through tools.\n"
        "CRITICAL RULES:\n"
        "1. Never invent or estimate financial figures. Always call query_db to get real numbers.\n"
        f"2. When the user asks about 'this month' (tháng này), always use month='{current_month}'.\n"
        "3. For questions about budget, spending limits, or financial safety, call query_db with query_type='budget_status'.\n"
        "4. For semantic memory questions (e.g. 'what do I usually buy', 'find similar purchases'), call search_memory.\n"
        "5. Respond in the same language the user writes in (Vietnamese or English).\n"
        "6. Be concise, polite, actionable, and clear."
    )


async def llm_node(state: AgentState) -> AgentState:
    new_state = dict(state)
    system_msg = _build_system_prompt()
    model = get_chat_model(tools=ALL_TOOLS, system_instruction=system_msg)

    # Convert prior turns into Gemini chat history format
    gemini_history = []
    prior_messages = state["messages"][:-1]
    # Keep last 8 turns to preserve tokens and prevent latency
    for m in prior_messages[-8:]:
        role = "user" if m.get("role") == "user" else "model"
        gemini_history.append({"role": role, "parts": [m.get("content", "")]})

    chat = model.start_chat(history=gemini_history)
    user_message = state["messages"][-1]["content"]

    try:
        response = chat.send_message(user_message)
    except Exception as exc:
        logger.warning("Gemini chat error: %s", exc)
        new_state["final_reply"] = f"Không thể kết nối tới mô hình AI: {exc}"
        new_state["_pending_tool_calls"] = []
        return new_state

    # Check if Gemini wants to call a tool
    tool_calls = []
    if response.candidates:
        for part in response.candidates[0].content.parts:
            if hasattr(part, "function_call") and part.function_call:
                tool_calls.append(part.function_call)

    if tool_calls:
        new_state["_pending_tool_calls"] = tool_calls
    else:
        new_state["_pending_tool_calls"] = []
        new_state["final_reply"] = response.text if response.text else "Tôi có thể giúp bạn kiểm tra chi tiêu hoặc gợi ý tiết kiệm."
        new_state["tool_used"] = "none"

    return new_state


async def tool_executor_node(state: AgentState) -> AgentState:
    new_state = dict(state)
    tool_results = list(state.get("tool_results", []))
    tools_used = []

    for fn_call in state.get("_pending_tool_calls", []):
        name = fn_call.name
        args = dict(fn_call.args)
        tools_used.append(name)

        try:
            if name == "query_db":
                result = await execute_query_db(args, state["session"], state["user_id"])
            elif name == "search_memory":
                result = await execute_search_memory(args, state["user_id"])
            else:
                result = f"Unknown tool: {name}"
        except Exception as exc:
            logger.warning("Error running tool %s: %s", name, exc)
            result = f"Error running tool {name}: {exc}"

        tool_results.append(result)

    new_state["tool_results"] = tool_results
    new_state["tool_used"] = ", ".join(tools_used)
    new_state["_pending_tool_calls"] = []
    return new_state


async def synthesize_node(state: AgentState) -> AgentState:
    new_state = dict(state)
    system_msg = _build_system_prompt()
    model = get_chat_model(tools=None, system_instruction=system_msg)
    context = "\n\nData retrieved from tools:\n" + "\n".join(state.get("tool_results", []))

    # Add brief conversation history context
    prior_turns = state["messages"][-5:-1]
    history_snippet = ""
    if prior_turns:
        history_snippet = "Recent conversation:\n" + "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in prior_turns]) + "\n\n"

    prompt = (
        f"{history_snippet}"
        f"User question: {state['messages'][-1]['content']}\n"
        f"{context}\n\n"
        f"Please formulate a clear, complete, and helpful response to the user based on the tool data."
    )
    try:
        response = model.generate_content(prompt)
        new_state["final_reply"] = response.text if response.text else "Dữ liệu chi tiêu đã được cập nhật."
    except Exception as exc:
        logger.warning("Synthesis error: %s", exc)
        new_state["final_reply"] = "\n".join(state.get("tool_results", []))

    new_state["_pending_tool_calls"] = []
    return new_state


def should_use_tool(state: AgentState) -> str:
    if state.get("_pending_tool_calls"):
        return "tool_executor"
    return END


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("llm", llm_node)
    graph.add_node("tool_executor", tool_executor_node)
    graph.add_node("synthesize", synthesize_node)

    graph.add_edge(START, "llm")
    graph.add_conditional_edges("llm", should_use_tool, {"tool_executor": "tool_executor", END: END})
    graph.add_edge("tool_executor", "synthesize")
    graph.add_edge("synthesize", END)
    return graph.compile()


_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


async def run_agent(
    message: str,
    user_id: str,
    session: AsyncSession,
    history: list[dict] | None = None,
) -> dict:
    started = time.perf_counter()
    try:
        graph = get_graph()
        initial_messages = list(history or [])
        initial_messages.append({"role": "user", "content": message})

        result = await graph.ainvoke({
            "user_id": user_id,
            "session": session,
            "messages": initial_messages,
            "tool_results": [],
            "final_reply": "",
            "tool_used": "none",
            "latency_ms": 0,
            "_pending_tool_calls": [],
        })
        latency = int((time.perf_counter() - started) * 1000)
        return {
            "reply": result.get("final_reply", "Xin lỗi, tôi chưa thể trả lời yêu cầu này."),
            "tool_used": result.get("tool_used", "none"),
            "latency_ms": latency,
        }
    except Exception as exc:
        logger.exception("Agent execution failed: %s", exc)
        latency = int((time.perf_counter() - started) * 1000)
        return {
            "reply": f"Hệ thống AI tạm thời gặp sự cố: {exc}",
            "tool_used": "error",
            "latency_ms": latency,
        }