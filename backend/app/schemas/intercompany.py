from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.intercompany import ICInvoiceCategory, ICInvoiceStatus, ICLoanStatus


# ---------------------------------------------------------------------------
# IC Invoice schemas
# ---------------------------------------------------------------------------


class ICInvoiceCreate(BaseModel):
    invoice_number: str = Field(max_length=100)
    sender_site_id: uuid.UUID
    receiver_site_id: uuid.UUID
    invoice_date: date
    due_date: date
    currency: str = Field(max_length=3, min_length=3)
    amount: Decimal = Field(ge=0)
    description: str
    category: ICInvoiceCategory
    status: ICInvoiceStatus = ICInvoiceStatus.draft


class ICInvoiceUpdate(BaseModel):
    status: ICInvoiceStatus | None = None
    matched_with_id: uuid.UUID | None = None
    description: str | None = None
    due_date: date | None = None


class ICInvoiceResponse(BaseModel):
    id: uuid.UUID
    invoice_number: str
    sender_site_id: uuid.UUID
    receiver_site_id: uuid.UUID
    invoice_date: date
    due_date: date
    currency: str
    amount: Decimal
    description: str
    category: ICInvoiceCategory
    status: ICInvoiceStatus
    matched_with_id: uuid.UUID | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ICInvoiceListResponse(BaseModel):
    items: list[ICInvoiceResponse]
    total: int


# ---------------------------------------------------------------------------
# IC Loan schemas
# ---------------------------------------------------------------------------


class ICLoanCreate(BaseModel):
    lender_site_id: uuid.UUID
    borrower_site_id: uuid.UUID
    currency: str = Field(max_length=3, min_length=3)
    principal_amount: Decimal = Field(ge=0)
    interest_rate: Decimal = Field(ge=0, le=1)
    start_date: date
    maturity_date: date
    outstanding_balance: Decimal = Field(ge=0)
    status: ICLoanStatus = ICLoanStatus.active


class ICLoanUpdate(BaseModel):
    outstanding_balance: Decimal | None = None
    status: ICLoanStatus | None = None
    maturity_date: date | None = None


class ICLoanResponse(BaseModel):
    id: uuid.UUID
    lender_site_id: uuid.UUID
    borrower_site_id: uuid.UUID
    currency: str
    principal_amount: Decimal
    interest_rate: Decimal
    start_date: date
    maturity_date: date
    outstanding_balance: Decimal
    status: ICLoanStatus
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ICLoanListResponse(BaseModel):
    items: list[ICLoanResponse]
    total: int


class ICLoanSitePairSummary(BaseModel):
    lender_site_id: uuid.UUID
    borrower_site_id: uuid.UUID
    currency: str
    total_outstanding: Decimal
    loan_count: int


class ICLoanSummaryResponse(BaseModel):
    total_outstanding: Decimal
    pairs: list[ICLoanSitePairSummary]


# ---------------------------------------------------------------------------
# Reconciliation schemas
# ---------------------------------------------------------------------------


class ICReconciliationEntry(BaseModel):
    sender_invoice: ICInvoiceResponse | None
    receiver_invoice: ICInvoiceResponse | None
    match_status: str  # "matched", "unmatched_sender", "unmatched_receiver", "amount_mismatch"
    difference: Decimal | None = None


class ICReconciliationReport(BaseModel):
    year: int
    month: int
    total_invoices: int
    matched_count: int
    unmatched_count: int
    mismatched_count: int
    entries: list[ICReconciliationEntry]


__all__ = [
    "ICInvoiceCreate",
    "ICInvoiceUpdate",
    "ICInvoiceResponse",
    "ICInvoiceListResponse",
    "ICLoanCreate",
    "ICLoanUpdate",
    "ICLoanResponse",
    "ICLoanListResponse",
    "ICLoanSitePairSummary",
    "ICLoanSummaryResponse",
    "ICReconciliationEntry",
    "ICReconciliationReport",
]
