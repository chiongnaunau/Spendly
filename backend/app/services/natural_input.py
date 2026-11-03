"""Service for parsing natural language text/voice input into structured financial transactions using Gemini."""
from __future__ import annotations

import json
import logging
import re
from datetime import date, timedelta
from decimal import Decimal

from app.ai.gemini import extract_structured_json
from app.schemas.natural_input import ParsedExpenseResponse

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are an expert Vietnamese personal finance assistant.
Your task is to parse a natural language statement (which may come from voice transcription or quick typing) into a structured transaction.

Current date is: {current_date}

Extract and return ONLY a valid JSON object matching this schema:
{{
  "item_name": "string (clear name of the expense/income, e.g. 'Ăn bún chả', 'Đổ xăng xe máy', 'Tiền thưởng dự án')",
  "total_price": number (in VND, positive integer, e.g. 45000),
  "category": "string (must be one of: 'an_uong', 'di_chuyen', 'mua_sam', 'y_te', 'giai_tri', 'hoa_don', 'giao_duc', 'khac')",
  "store_name": "string or null (e.g. 'Highlands Coffee', 'Petrolimex', 'Shopee')",
  "type": "string (must be 'EXPENSE' or 'INCOME')",
  "transaction_date": "YYYY-MM-DD",
  "confidence": number (between 0.0 and 1.0)
}}

Rules:
1. Vietnamese slang / currency shortcuts:
   - 'k', 'ngàn', 'nghìn', 'cành' -> x 1,000 (e.g. 50k = 50000)
   - 'xị' -> x 100,000 (e.g. 2 xị = 200000, 5 xị = 500000)
   - 'loét' -> x 100,000 (e.g. 1 loét = 100000)
   - 'củ', 'tr', 'triệu' -> x 1,000,000 (e.g. 2 củ = 2000000, 2.5tr = 2500000, nửa củ = 500000)
2. Type detection:
   - 'INCOME' if the user mentions receiving money, salary, bonus, gifts, sales, debt repayment (e.g., 'nhận lương', 'tiền thưởng', 'bán đồ cũ', 'khách chuyển khoản', 'nhận tiền').
   - Otherwise, default to 'EXPENSE'.
3. Date detection:
   - 'hôm qua' -> yesterday's date
   - 'hôm kia' -> 2 days ago
   - If no specific date is mentioned, use today's date ({current_date}).
4. Category mapping:
   - Food/drink/restaurants -> 'an_uong'
   - Transport/fuel/parking/grab/taxi -> 'di_chuyen'
   - Shopping/clothes/gadgets -> 'mua_sam'
   - Healthcare/medicine -> 'y_te'
   - Movies/games/cafes for chilling/party -> 'giai_tri'
   - Electricity/water/internet/rent -> 'hoa_don'
   - Tuition/books/courses -> 'giao_duc'
   - Everything else -> 'khac'

Return ONLY the JSON object. Do NOT wrap in markdown codeblocks. Do NOT include any explanations.
"""


def _heuristic_fallback(text: str, today: date) -> ParsedExpenseResponse:
    """Fallback parser if Gemini is unavailable or rate-limited."""
    lower = text.lower()

    # Determine type
    is_income = any(
        kw in lower
        for kw in ["lương", "thưởng", "thu nhập", "nhận tiền", "khách trả", "bán được"]
    )
    tx_type = "INCOME" if is_income else "EXPENSE"

    # Extract price
    amount = Decimal("50000")
    # Match patterns like 50k, 50.000, 50000, 2 củ, 2tr
    match_cu = re.search(r"(\d+(?:\.\d+)?)\s*(?:củ|triệu|tr)", lower)
    if match_cu:
        amount = Decimal(str(float(match_cu.group(1)) * 1_000_000))
    else:
        match_k = re.search(r"(\d+(?:\.\d+)?)\s*(?:k|ngàn|nghìn|cành)", lower)
        if match_k:
            amount = Decimal(str(float(match_k.group(1)) * 1_000))
        else:
            match_num = re.search(r"(\d[\d\.,]*)", lower)
            if match_num:
                clean_num = match_num.group(1).replace(".", "").replace(",", "")
                try:
                    val = Decimal(clean_num)
                    if val > 0:
                        amount = val
                except Exception:
                    pass

    # Extract category
    category = "khac"
    if any(k in lower for k in ["ăn", "uống", "cơm", "phở", "bún", "trà", "cà phê", "cafe", "bánh"]):
        category = "an_uong"
    elif any(k in lower for k in ["xăng", "xe", "grab", "taxi", "gửi xe", "vé xe", "be"]):
        category = "di_chuyen"
    elif any(k in lower for k in ["mua", "quần", "áo", "giày", "shopee", "tiki", "lazada"]):
        category = "mua_sam"
    elif any(k in lower for k in ["thuốc", "khám", "bệnh", "y tế", "bác sĩ"]):
        category = "y_te"
    elif any(k in lower for k in ["điện", "nước", "mạng", "wifi", "tiền nhà", "hóa đơn"]):
        category = "hoa_don"

    # Date
    tx_date = today
    if "hôm qua" in lower:
        tx_date = today - timedelta(days=1)
    elif "hôm kia" in lower:
        tx_date = today - timedelta(days=2)

    return ParsedExpenseResponse(
        item_name=text.strip()[:60] or "Khoản chi tiêu",
        total_price=amount,
        category=category,
        store_name=None,
        type=tx_type,
        transaction_date=tx_date,
        confidence=0.6,
        raw_text=text,
    )


async def parse_natural_language_input(raw_text: str) -> ParsedExpenseResponse:
    today = date.today()
    clean_text = raw_text.strip()
    if not clean_text:
        return _heuristic_fallback("Khoản chi tiêu", today)

    prompt = SYSTEM_PROMPT.format(current_date=today.isoformat())

    try:
        raw_json = await extract_structured_json(prompt, clean_text)
        cleaned = (
            raw_json.strip()
            .removeprefix("```json")
            .removeprefix("```")
            .removesuffix("```")
            .strip()
        )
        data = json.loads(cleaned)

        # Parse date safely
        date_str = data.get("transaction_date")
        try:
            tx_date = date.fromisoformat(date_str) if date_str else today
        except Exception:
            tx_date = today

        # Validate category
        valid_cats = {
            "an_uong", "di_chuyen", "mua_sam", "y_te",
            "giai_tri", "hoa_don", "giao_duc", "khac"
        }
        cat = str(data.get("category", "khac")).lower()
        if cat not in valid_cats:
            cat = "khac"

        tx_type = "INCOME" if str(data.get("type", "EXPENSE")).upper() == "INCOME" else "EXPENSE"
        price_val = Decimal(str(data.get("total_price", 0)))
        if price_val < 0:
            price_val = abs(price_val)

        return ParsedExpenseResponse(
            item_name=str(data.get("item_name") or clean_text)[:255],
            total_price=price_val,
            category=cat,
            store_name=data.get("store_name"),
            type=tx_type,
            transaction_date=tx_date,
            confidence=float(data.get("confidence", 0.95)),
            raw_text=clean_text,
        )
    except Exception as exc:
        logger.warning("Gemini natural input parsing failed (%s), falling back to heuristics", exc)
        return _heuristic_fallback(clean_text, today)
