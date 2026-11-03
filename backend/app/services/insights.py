from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.insights import InsightItem, InsightsResponse
from app.services.budgets import calculate_budget_status, get_month_range
from app.services.stats import monthly_stats

CATEGORY_NAMES: dict[str, str] = {
  "an_uong": "Ăn uống",
  "FOOD": "Ăn uống",
  "di_chuyen": "Di chuyển",
  "TRANSPORT": "Di chuyển",
  "mua_sam": "Mua sắm",
  "SHOPPING": "Mua sắm",
  "y_te": "Y tế",
  "HEALTH": "Y tế",
  "giai_tri": "Giải trí",
  "ENTERTAINMENT": "Giải trí",
  "hoa_don": "Hóa đơn / Tiện ích",
  "UTILITIES": "Hóa đơn / Tiện ích",
  "giao_duc": "Giáo dục",
  "EDUCATION": "Giáo dục",
  "khac": "Khác",
}


async def generate_proactive_insights(
    session: AsyncSession, user_id: str, month: str
) -> InsightsResponse:
    stats = await monthly_stats(session, user_id, month)
    budget = await calculate_budget_status(session, user_id, month)

    start, end = get_month_range(month)
    today = date.today()

    total_spent = Decimal(str(stats["total"]))
    total_income = Decimal(str(stats["total_income"]))
    net_cashflow = Decimal(str(stats["net_cashflow"]))
    savings_rate = stats.get("savings_rate_pct")

    # Calculate days passed & remaining
    if today.year == start.year and today.month == start.month:
        days_passed = max(1, today.day)
        last_day = (end - timedelta(days=1)).day
        days_remaining = max(0, last_day - today.day)
    elif today > end:
        days_passed = (end - start).days
        days_remaining = 0
    else:
        days_passed = 1
        days_remaining = (end - start).days

    daily_burn_rate = (
        round(total_spent / Decimal(days_passed), 2)
        if days_passed > 0
        else Decimal("0.00")
    )
    projected_total = round(
        total_spent + (daily_burn_rate * Decimal(days_remaining)), 2
    )

    # Compute Financial Health Score (0 - 100)
    score = 75
    if budget.budget_amount and budget.budget_amount > 0:
        if total_spent > budget.budget_amount:
            score -= 35
        elif projected_total > budget.budget_amount:
            score -= 20
        elif budget.pct_used is not None and budget.pct_used < 60:
            score += 15
    if total_income > 0:
        if net_cashflow > 0:
            score += 10
            if savings_rate and savings_rate >= 30:
                score += 10
        else:
            score -= 30
    elif total_spent > 0 and not budget.budget_amount:
        score -= 5

    score = max(10, min(100, score))

    if score >= 85:
        health_status = "EXCELLENT"
    elif score >= 65:
        health_status = "GOOD"
    elif score >= 45:
        health_status = "CAUTION"
    else:
        health_status = "WARNING"

    items: list[InsightItem] = []

    # 1. Forecast Insight
    if budget.budget_amount and budget.budget_amount > 0:
        if projected_total > budget.budget_amount:
            diff = projected_total - budget.budget_amount
            items.append(
                InsightItem(
                    id="forecast_risk",
                    type="FORECAST",
                    level="WARNING",
                    title="Cảnh báo: Nguy cơ vượt ngân sách cuối tháng",
                    message=(
                        f"Với tốc độ tiêu trung bình {daily_burn_rate:,.0f}₫/ngày, "
                        f"dự kiến cả tháng bạn sẽ chi khoảng {projected_total:,.0f}₫, "
                        f"vượt hạn mức ngân sách {diff:,.0f}₫. Nên giảm bớt các khoản chi tùy ý."
                    ),
                )
            )
        else:
            saved = budget.budget_amount - projected_total
            items.append(
                InsightItem(
                    id="forecast_safe",
                    type="FORECAST",
                    level="SUCCESS",
                    title="Dự báo: Tiến độ chi tiêu rất an toàn",
                    message=(
                        f"Tốc độ chi tiêu hiện tại là {daily_burn_rate:,.0f}₫/ngày. "
                        f"Dự kiến đến cuối tháng bạn chỉ tiêu khoảng {projected_total:,.0f}₫, "
                        f"tiết kiệm thêm được {saved:,.0f}₫ so với hạn mức ngân sách."
                    ),
                )
            )
    else:
        items.append(
            InsightItem(
                id="burn_rate_info",
                type="FORECAST",
                level="INFO",
                title="Tốc độ chi tiêu trung bình",
                message=(
                    f"Hiện bạn đang chi tiêu trung bình {daily_burn_rate:,.0f}₫ mỗi ngày. "
                    f"Dự kiến tổng chi tiêu tháng {month} sẽ vào khoảng {projected_total:,.0f}₫."
                ),
            )
        )

    # 2. Category Optimization Insight
    by_cat = stats.get("by_category", {})
    if by_cat and total_spent > 0:
        top_cat, top_val = sorted(
            by_cat.items(), key=lambda x: Decimal(str(x[1])), reverse=True
        )[0]
        top_dec = Decimal(str(top_val))
        cat_pct = round((top_dec / total_spent) * 100, 1)
        cat_label = CATEGORY_NAMES.get(top_cat, top_cat)

        if cat_pct >= 40:
            items.append(
                InsightItem(
                    id="top_category_focus",
                    type="SAVINGS",
                    level="INFO",
                    title=f"Tập trung tối ưu: {cat_label}",
                    message=(
                        f"Nhóm '{cat_label}' đang chiếm tới {cat_pct}% tổng chi tiêu của bạn ({top_dec:,.0f}₫). "
                        f"Đây là danh mục tiềm năng nhất để bạn cắt giảm nếu muốn gia tăng tiền tiết kiệm."
                    ),
                )
            )

    # 3. Cashflow & Savings Insight
    if total_income > 0:
        if net_cashflow > 0:
            items.append(
                InsightItem(
                    id="cashflow_health_pos",
                    type="HEALTH",
                    level="SUCCESS",
                    title="Dòng tiền thặng dư xuất sắc",
                    message=(
                        f"Bạn đang giữ lại được {net_cashflow:,.0f}₫ (tỷ lệ tiết kiệm {savings_rate}%). "
                        f"Bạn có thể cân nhắc chuyển khoản dư này vào quỹ khẩn cấp hoặc đầu tư sinh lời."
                    ),
                )
            )
        else:
            items.append(
                InsightItem(
                    id="cashflow_health_neg",
                    type="HEALTH",
                    level="DANGER",
                    title="Cảnh báo: Dòng tiền đang thâm hụt",
                    message=(
                        f"Tổng chi tiêu tháng này đang vượt quá thu nhập {abs(net_cashflow):,.0f}₫. "
                        f"Hãy tạm dừng các khoản mua sắm chưa thực sự cần thiết."
                    ),
                )
            )
    elif total_spent > 0:
        items.append(
            InsightItem(
                id="income_reminder",
                type="SAVINGS",
                level="INFO",
                title="Gợi ý: Cập nhật nguồn thu nhập",
                message=(
                    "Bạn chưa ghi nhận khoản thu nhập nào trong tháng này. "
                    "Hãy bấm '+ Thêm giao dịch' và chọn tab 'Khoản thu nhập' để theo dõi dòng tiền ròng chính xác."
                ),
            )
        )

    return InsightsResponse(
        month=month,
        health_score=score,
        health_status=health_status,
        daily_burn_rate=daily_burn_rate,
        projected_total=projected_total,
        insights=items,
    )
