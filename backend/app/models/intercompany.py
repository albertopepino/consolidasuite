from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ICInvoiceCategory(str, enum.Enum):
    services = "services"
    goods = "goods"
    management_fee = "management_fee"
    royalty = "royalty"
    loan_interest = "loan_interest"
    other = "other"


class ICInvoiceStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    received = "received"
    matched = "matched"
    disputed = "disputed"
    eliminated = "eliminated"


class ICLoanStatus(str, enum.Enum):
    active = "active"
    repaid = "repaid"
    defaulted = "defaulted"


class ICInvoice(Base):
    __tablename__ = "ic_invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    sender_site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    receiver_site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[ICInvoiceCategory] = mapped_column(Enum(ICInvoiceCategory), nullable=False)
    status: Mapped[ICInvoiceStatus] = mapped_column(
        Enum(ICInvoiceStatus), nullable=False, default=ICInvoiceStatus.draft
    )
    matched_with_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ic_invoices.id"), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    sender_site = relationship("Site", foreign_keys=[sender_site_id], lazy="selectin")
    receiver_site = relationship("Site", foreign_keys=[receiver_site_id], lazy="selectin")
    matched_with = relationship("ICInvoice", remote_side=[id], lazy="selectin")
    creator = relationship("User", lazy="selectin")


class ICLoan(Base):
    __tablename__ = "ic_loans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lender_site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    borrower_site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    principal_amount: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    interest_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    maturity_date: Mapped[date] = mapped_column(Date, nullable=False)
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    status: Mapped[ICLoanStatus] = mapped_column(
        Enum(ICLoanStatus), nullable=False, default=ICLoanStatus.active
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    lender_site = relationship("Site", foreign_keys=[lender_site_id], lazy="selectin")
    borrower_site = relationship("Site", foreign_keys=[borrower_site_id], lazy="selectin")
    creator = relationship("User", lazy="selectin")


__all__ = [
    "ICInvoice",
    "ICInvoiceCategory",
    "ICInvoiceStatus",
    "ICLoan",
    "ICLoanStatus",
]
