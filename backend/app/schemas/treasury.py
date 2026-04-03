from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models.treasury import BankAccountType, DebtStatus, InstrumentType


# ---------------------------------------------------------------------------
# Bank Account
# ---------------------------------------------------------------------------


class BankAccountCreate(BaseModel):
    bank_name: str = Field(max_length=255)
    account_number: str = Field(max_length=50)
    iban: str | None = Field(None, max_length=34)
    swift_bic: str | None = Field(None, max_length=11)
    currency: str = Field(max_length=3)
    account_type: BankAccountType
    is_primary: bool = False


class BankAccountResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    bank_name: str
    account_number_masked: str
    iban: str | None
    swift_bic: str | None
    currency: str
    account_type: BankAccountType
    is_primary: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("account_number_masked", mode="before")
    @classmethod
    def mask_account(cls, v: str) -> str:
        """Already masked values pass through; raw values get masked."""
        if v and len(v) > 4:
            return "****" + v[-4:]
        return "****"


class BankAccountListResponse(BaseModel):
    items: list[BankAccountResponse]
    total: int


# ---------------------------------------------------------------------------
# Cash Position
# ---------------------------------------------------------------------------


class CashPositionCreate(BaseModel):
    bank_account_id: uuid.UUID
    balance_date: date
    balance: Decimal
    currency: str = Field(max_length=3)


class CashPositionResponse(BaseModel):
    id: uuid.UUID
    bank_account_id: uuid.UUID
    balance_date: date
    balance: Decimal
    currency: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SiteCashPosition(BaseModel):
    site_id: uuid.UUID
    site_name: str
    accounts: list[AccountCashEntry]
    total_local: Decimal
    local_currency: str


class AccountCashEntry(BaseModel):
    bank_account_id: uuid.UUID
    bank_name: str
    balance: Decimal
    currency: str


# Rebuild SiteCashPosition after AccountCashEntry is defined
SiteCashPosition.model_rebuild()


class ConsolidatedCashResponse(BaseModel):
    date: date
    group_currency: str
    total_group: Decimal
    by_site: list[SiteCashPosition]


# ---------------------------------------------------------------------------
# Debt Instrument
# ---------------------------------------------------------------------------


class DebtInstrumentCreate(BaseModel):
    instrument_type: InstrumentType
    lender: str = Field(max_length=255)
    currency: str = Field(max_length=3)
    principal_amount: Decimal
    outstanding_amount: Decimal
    interest_rate: Decimal = Field(ge=0, le=1)
    start_date: date
    maturity_date: date
    repayment_schedule: str | None = Field(None, max_length=50)
    status: DebtStatus = DebtStatus.active


class DebtInstrumentResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    instrument_type: InstrumentType
    lender: str
    currency: str
    principal_amount: Decimal
    outstanding_amount: Decimal
    interest_rate: Decimal
    start_date: date
    maturity_date: date
    repayment_schedule: str | None
    status: DebtStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DebtInstrumentListResponse(BaseModel):
    items: list[DebtInstrumentResponse]
    total: int


class MaturityBucket(BaseModel):
    bucket: str  # e.g. "0-1y", "1-3y", "3-5y", "5y+"
    total_outstanding: Decimal
    instrument_count: int


class MaturityProfileResponse(BaseModel):
    group_currency: str
    buckets: list[MaturityBucket]
    total_debt: Decimal


__all__ = [
    "BankAccountCreate",
    "BankAccountResponse",
    "BankAccountListResponse",
    "CashPositionCreate",
    "CashPositionResponse",
    "SiteCashPosition",
    "AccountCashEntry",
    "ConsolidatedCashResponse",
    "DebtInstrumentCreate",
    "DebtInstrumentResponse",
    "DebtInstrumentListResponse",
    "MaturityBucket",
    "MaturityProfileResponse",
]
