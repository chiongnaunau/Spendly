from decimal import Decimal
from pydantic import BaseModel


class InsightItem(BaseModel):
    id: str
    type: str  # 'FORECAST' | 'ANOMALY' | 'SAVINGS' | 'HEALTH'
    level: str  # 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS'
    title: str
    message: str


class InsightsResponse(BaseModel):
    month: str
    health_score: int  # 0 to 100
    health_status: str  # 'EXCELLENT' | 'GOOD' | 'CAUTION' | 'WARNING'
    daily_burn_rate: Decimal
    projected_total: Decimal
    insights: list[InsightItem]
