from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.scenario import AdjustmentType, ForecastSource


# --- Scenario Assumption schemas ---

class ScenarioAssumptionCreate(BaseModel):
    site_id: uuid.UUID | None = None
    line_item_code: str = Field(max_length=50)
    adjustment_type: AdjustmentType
    adjustment_value: Decimal
    period_year: int = Field(ge=2000, le=2100)
    period_month: int | None = Field(None, ge=1, le=12)


class ScenarioAssumptionResponse(BaseModel):
    id: uuid.UUID
    scenario_id: uuid.UUID
    site_id: uuid.UUID | None
    line_item_code: str
    adjustment_type: AdjustmentType
    adjustment_value: Decimal
    period_year: int
    period_month: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Scenario schemas ---

class ScenarioCreate(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None
    base_year: int = Field(ge=2000, le=2100)
    assumptions: list[ScenarioAssumptionCreate] = Field(default_factory=list)


class ScenarioUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = None
    is_active: bool | None = None


class ScenarioResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    base_year: int
    is_active: bool
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    assumptions: list[ScenarioAssumptionResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ScenarioListResponse(BaseModel):
    items: list[ScenarioResponse]
    total: int


# --- Projected financials ---

class ProjectedLineItem(BaseModel):
    line_item_code: str
    original_amount: Decimal
    adjusted_amount: Decimal
    adjustment_type: AdjustmentType | None = None
    adjustment_value: Decimal | None = None


class ProjectedFinancials(BaseModel):
    scenario_id: uuid.UUID
    scenario_name: str
    items: list[ProjectedLineItem]


class ScenarioComparison(BaseModel):
    scenarios: list[ProjectedFinancials]


# --- Rolling Forecast schemas ---

class RollingForecastCreate(BaseModel):
    site_id: uuid.UUID
    line_item_code: str = Field(max_length=50)
    period_year: int = Field(ge=2000, le=2100)
    period_month: int = Field(ge=1, le=12)
    forecast_amount: Decimal
    source: ForecastSource = ForecastSource.manual


class RollingForecastUpdate(BaseModel):
    forecast_amount: Decimal
    source: ForecastSource | None = None


class RollingForecastResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    line_item_code: str
    period_year: int
    period_month: int
    forecast_amount: Decimal
    source: ForecastSource
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RollingForecastListResponse(BaseModel):
    items: list[RollingForecastResponse]
    total: int


__all__ = [
    "ScenarioAssumptionCreate",
    "ScenarioAssumptionResponse",
    "ScenarioCreate",
    "ScenarioUpdate",
    "ScenarioResponse",
    "ScenarioListResponse",
    "ProjectedLineItem",
    "ProjectedFinancials",
    "ScenarioComparison",
    "RollingForecastCreate",
    "RollingForecastUpdate",
    "RollingForecastResponse",
    "RollingForecastListResponse",
]
