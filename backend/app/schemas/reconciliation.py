from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.reconciliation import ReconciliationStatus


# --- Reconciliation Rule schemas ---

class ReconciliationRuleCreate(BaseModel):
    name: str = Field(max_length=255)
    account_code: str = Field(max_length=50)
    match_criteria: dict | None = None


class ReconciliationRuleResponse(BaseModel):
    id: uuid.UUID
    name: str
    account_code: str
    match_criteria: dict | None
    is_active: bool
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ReconciliationRuleListResponse(BaseModel):
    items: list[ReconciliationRuleResponse]
    total: int


# --- Reconciliation Item schemas ---

class ReconciliationItemCreate(BaseModel):
    site_id: uuid.UUID
    account_code: str = Field(max_length=50)
    period_year: int = Field(ge=2000, le=2100)
    period_month: int = Field(ge=1, le=12)
    source: str = Field(max_length=50)
    reference: str | None = Field(None, max_length=255)
    amount: Decimal
    transaction_date: date
    description: str | None = None


class ReconciliationItemUpdate(BaseModel):
    status: ReconciliationStatus | None = None
    matched_with_id: uuid.UUID | None = None


class ReconciliationItemResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    account_code: str
    period_year: int
    period_month: int
    source: str
    reference: str | None
    amount: Decimal
    transaction_date: date
    description: str | None
    status: ReconciliationStatus
    matched_with_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReconciliationItemListResponse(BaseModel):
    items: list[ReconciliationItemResponse]
    total: int


__all__ = [
    "ReconciliationRuleCreate",
    "ReconciliationRuleResponse",
    "ReconciliationRuleListResponse",
    "ReconciliationItemCreate",
    "ReconciliationItemUpdate",
    "ReconciliationItemResponse",
    "ReconciliationItemListResponse",
]
