from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.allocation import AllocationMethod


# --- Allocation Target schemas ---

class AllocationTargetCreate(BaseModel):
    target_site_id: uuid.UUID
    percentage: Decimal


class AllocationTargetResponse(BaseModel):
    id: uuid.UUID
    rule_id: uuid.UUID
    target_site_id: uuid.UUID
    percentage: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Allocation Rule schemas ---

class AllocationRuleCreate(BaseModel):
    name: str = Field(max_length=255)
    source_site_id: uuid.UUID
    source_account_code: str = Field(max_length=50)
    method: AllocationMethod
    targets: list[AllocationTargetCreate] = Field(default_factory=list)


class AllocationRuleUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    is_active: bool | None = None


class AllocationRuleResponse(BaseModel):
    id: uuid.UUID
    name: str
    source_site_id: uuid.UUID
    source_account_code: str
    method: AllocationMethod
    is_active: bool
    created_by: uuid.UUID
    created_at: datetime
    targets: list[AllocationTargetResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class AllocationRuleListResponse(BaseModel):
    items: list[AllocationRuleResponse]
    total: int


# --- Allocation Result schemas ---

class AllocationExecute(BaseModel):
    period_year: int = Field(ge=2000, le=2100)
    period_month: int = Field(ge=1, le=12)
    source_amount: Decimal


class AllocationResultResponse(BaseModel):
    id: uuid.UUID
    rule_id: uuid.UUID
    period_year: int
    period_month: int
    source_amount: Decimal
    results: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AllocationResultListResponse(BaseModel):
    items: list[AllocationResultResponse]
    total: int


__all__ = [
    "AllocationTargetCreate",
    "AllocationTargetResponse",
    "AllocationRuleCreate",
    "AllocationRuleUpdate",
    "AllocationRuleResponse",
    "AllocationRuleListResponse",
    "AllocationExecute",
    "AllocationResultResponse",
    "AllocationResultListResponse",
]
