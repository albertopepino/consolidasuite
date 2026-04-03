from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.fixed_assets import AssetCategory, AssetStatus, DepreciationMethod


# ---------------------------------------------------------------------------
# Asset CRUD schemas
# ---------------------------------------------------------------------------


class AssetCreate(BaseModel):
    asset_code: str = Field(max_length=50)
    name: str = Field(max_length=255)
    category: AssetCategory
    acquisition_date: date
    acquisition_cost: Decimal = Field(ge=0)
    currency: str = Field(max_length=3, min_length=3)
    useful_life_months: int = Field(ge=1)
    depreciation_method: DepreciationMethod = DepreciationMethod.straight_line
    residual_value: Decimal = Field(ge=0, default=Decimal("0"))
    location: str | None = None
    notes: str | None = None


class AssetUpdate(BaseModel):
    name: str | None = None
    category: AssetCategory | None = None
    useful_life_months: int | None = Field(None, ge=1)
    depreciation_method: DepreciationMethod | None = None
    residual_value: Decimal | None = Field(None, ge=0)
    accumulated_depreciation: Decimal | None = Field(None, ge=0)
    disposal_date: date | None = None
    disposal_amount: Decimal | None = Field(None, ge=0)
    status: AssetStatus | None = None
    location: str | None = None
    notes: str | None = None


class AssetResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    asset_code: str
    name: str
    category: AssetCategory
    acquisition_date: date
    acquisition_cost: Decimal
    currency: str
    useful_life_months: int
    depreciation_method: DepreciationMethod
    residual_value: Decimal
    accumulated_depreciation: Decimal
    net_book_value: Decimal
    disposal_date: date | None
    disposal_amount: Decimal | None
    status: AssetStatus
    location: str | None
    notes: str | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssetListResponse(BaseModel):
    items: list[AssetResponse]
    total: int


# ---------------------------------------------------------------------------
# Summary schemas
# ---------------------------------------------------------------------------


class AssetCategorySummary(BaseModel):
    category: AssetCategory
    count: int
    total_cost: Decimal
    total_nbv: Decimal


class AssetSummaryResponse(BaseModel):
    site_id: uuid.UUID
    total_assets: int
    total_cost: Decimal
    total_nbv: Decimal
    by_category: list[AssetCategorySummary]


class ConsolidatedAssetSummaryResponse(BaseModel):
    reporting_currency: str
    total_assets: int
    total_cost: Decimal
    total_nbv: Decimal
    by_category: list[AssetCategorySummary]


# ---------------------------------------------------------------------------
# Depreciation schedule
# ---------------------------------------------------------------------------


class DepreciationScheduleEntry(BaseModel):
    month: int  # offset from acquisition (1-based)
    period: str  # YYYY-MM
    opening_nbv: Decimal
    depreciation: Decimal
    accumulated_depreciation: Decimal
    closing_nbv: Decimal


class DepreciationScheduleResponse(BaseModel):
    asset_id: uuid.UUID
    asset_code: str
    name: str
    acquisition_cost: Decimal
    residual_value: Decimal
    useful_life_months: int
    depreciation_method: DepreciationMethod
    schedule: list[DepreciationScheduleEntry]


# ---------------------------------------------------------------------------
# CSV upload
# ---------------------------------------------------------------------------


class AssetUploadResponse(BaseModel):
    created: int
    errors: list[str]


__all__ = [
    "AssetCreate",
    "AssetUpdate",
    "AssetResponse",
    "AssetListResponse",
    "AssetCategorySummary",
    "AssetSummaryResponse",
    "ConsolidatedAssetSummaryResponse",
    "DepreciationScheduleEntry",
    "DepreciationScheduleResponse",
    "AssetUploadResponse",
]
