from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.lease import LeaseStandard, LeaseStatus, LeaseType


class LeaseCreate(BaseModel):
    site_id: uuid.UUID
    asset_description: str = Field(max_length=500)
    lease_type: LeaseType
    start_date: date
    end_date: date
    monthly_payment: Decimal
    discount_rate: Decimal
    right_of_use_asset: Decimal = Decimal("0")
    lease_liability: Decimal = Decimal("0")
    standard: LeaseStandard = LeaseStandard.ifrs16


class LeaseUpdate(BaseModel):
    asset_description: str | None = Field(None, max_length=500)
    monthly_payment: Decimal | None = None
    right_of_use_asset: Decimal | None = None
    lease_liability: Decimal | None = None
    status: LeaseStatus | None = None


class LeaseResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    asset_description: str
    lease_type: LeaseType
    start_date: date
    end_date: date
    monthly_payment: Decimal
    discount_rate: Decimal
    right_of_use_asset: Decimal
    lease_liability: Decimal
    standard: LeaseStandard
    status: LeaseStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class LeaseListResponse(BaseModel):
    items: list[LeaseResponse]
    total: int


__all__ = [
    "LeaseCreate",
    "LeaseUpdate",
    "LeaseResponse",
    "LeaseListResponse",
]
