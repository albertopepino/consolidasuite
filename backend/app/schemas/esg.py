from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.esg import ESGCategory, ESGFramework, ESGReportStatus


# --- ESG Metric schemas ---

class ESGMetricCreate(BaseModel):
    site_id: uuid.UUID
    category: ESGCategory
    metric_name: str = Field(max_length=255)
    metric_value: Decimal
    unit: str = Field(max_length=50)
    period_year: int = Field(ge=2000, le=2100)
    period_month: int = Field(ge=1, le=12)
    target_value: Decimal | None = None
    notes: str | None = None


class ESGMetricUpdate(BaseModel):
    metric_value: Decimal | None = None
    target_value: Decimal | None = None
    notes: str | None = None


class ESGMetricResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    category: ESGCategory
    metric_name: str
    metric_value: Decimal
    unit: str
    period_year: int
    period_month: int
    target_value: Decimal | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ESGMetricListResponse(BaseModel):
    items: list[ESGMetricResponse]
    total: int


# --- ESG Report schemas ---

class ESGReportCreate(BaseModel):
    report_year: int = Field(ge=2000, le=2100)
    framework: ESGFramework


class ESGReportUpdate(BaseModel):
    status: ESGReportStatus | None = None
    published_date: date | None = None


class ESGReportResponse(BaseModel):
    id: uuid.UUID
    report_year: int
    framework: ESGFramework
    status: ESGReportStatus
    published_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ESGReportListResponse(BaseModel):
    items: list[ESGReportResponse]
    total: int


__all__ = [
    "ESGMetricCreate",
    "ESGMetricUpdate",
    "ESGMetricResponse",
    "ESGMetricListResponse",
    "ESGReportCreate",
    "ESGReportUpdate",
    "ESGReportResponse",
    "ESGReportListResponse",
]
