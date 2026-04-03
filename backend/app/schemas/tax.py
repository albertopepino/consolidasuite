from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.tax import FilingStatus, FilingType


# ---------------------------------------------------------------------------
# Tax Jurisdiction
# ---------------------------------------------------------------------------


class TaxJurisdictionCreate(BaseModel):
    site_id: uuid.UUID
    corporate_tax_rate: Decimal = Field(ge=0, le=1)
    vat_rate: Decimal = Field(ge=0, le=1)
    withholding_tax_rate: Decimal = Field(ge=0, le=1, default=Decimal("0"))
    social_security_employer_rate: Decimal = Field(ge=0, le=1)
    social_security_employee_rate: Decimal = Field(ge=0, le=1)
    fiscal_year_start_month: int = Field(ge=1, le=12, default=1)
    notes: str | None = None
    effective_from: date


class TaxJurisdictionResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    corporate_tax_rate: Decimal
    vat_rate: Decimal
    withholding_tax_rate: Decimal
    social_security_employer_rate: Decimal
    social_security_employee_rate: Decimal
    fiscal_year_start_month: int
    notes: str | None
    effective_from: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaxJurisdictionListResponse(BaseModel):
    items: list[TaxJurisdictionResponse]
    total: int


# ---------------------------------------------------------------------------
# Tax Filing
# ---------------------------------------------------------------------------


class TaxFilingCreate(BaseModel):
    site_id: uuid.UUID
    filing_type: FilingType
    period_year: int = Field(ge=2000, le=2100)
    period_quarter: int | None = Field(None, ge=1, le=4)
    due_date: date
    filed_date: date | None = None
    status: FilingStatus = FilingStatus.pending
    amount: Decimal | None = None
    currency: str = Field(max_length=3)
    notes: str | None = None


class TaxFilingUpdate(BaseModel):
    status: FilingStatus | None = None
    filed_date: date | None = None
    amount: Decimal | None = None
    notes: str | None = None


class TaxFilingResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    filing_type: FilingType
    period_year: int
    period_quarter: int | None
    due_date: date
    filed_date: date | None
    status: FilingStatus
    amount: Decimal | None
    currency: str
    notes: str | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaxFilingListResponse(BaseModel):
    items: list[TaxFilingResponse]
    total: int


# ---------------------------------------------------------------------------
# Overview / aggregation responses
# ---------------------------------------------------------------------------


class FilingOverviewSite(BaseModel):
    site_id: uuid.UUID
    site_name: str
    pending: int = 0
    in_progress: int = 0
    filed: int = 0
    overdue: int = 0
    accepted: int = 0
    rejected: int = 0
    total: int = 0


class FilingOverviewResponse(BaseModel):
    items: list[FilingOverviewSite]


class EffectiveTaxRateSite(BaseModel):
    site_id: uuid.UUID
    site_name: str
    total_tax_paid: Decimal
    currency: str
    effective_rate: Decimal | None = None


class EffectiveTaxRateResponse(BaseModel):
    items: list[EffectiveTaxRateSite]


__all__ = [
    "TaxJurisdictionCreate",
    "TaxJurisdictionResponse",
    "TaxJurisdictionListResponse",
    "TaxFilingCreate",
    "TaxFilingUpdate",
    "TaxFilingResponse",
    "TaxFilingListResponse",
    "FilingOverviewSite",
    "FilingOverviewResponse",
    "EffectiveTaxRateSite",
    "EffectiveTaxRateResponse",
]
