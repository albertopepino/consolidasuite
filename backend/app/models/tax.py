from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FilingType(str, enum.Enum):
    corporate_tax = "corporate_tax"
    vat_return = "vat_return"
    withholding_tax = "withholding_tax"
    transfer_pricing = "transfer_pricing"
    annual_accounts = "annual_accounts"
    other = "other"


class FilingStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    filed = "filed"
    overdue = "overdue"
    accepted = "accepted"
    rejected = "rejected"


class TaxJurisdiction(Base):
    __tablename__ = "tax_jurisdictions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    corporate_tax_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False)
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False)
    withholding_tax_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False, default=0)
    social_security_employer_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False)
    social_security_employee_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False)
    fiscal_year_start_month: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
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
    site = relationship("Site", lazy="selectin")


class TaxFiling(Base):
    __tablename__ = "tax_filings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filing_type: Mapped[FilingType] = mapped_column(Enum(FilingType), nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_quarter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    filed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[FilingStatus] = mapped_column(
        Enum(FilingStatus), nullable=False, default=FilingStatus.pending
    )
    amount: Mapped[Decimal | None] = mapped_column(Numeric(16, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    site = relationship("Site", lazy="selectin")
    creator = relationship("User", lazy="selectin")


__all__ = [
    "FilingType",
    "FilingStatus",
    "TaxJurisdiction",
    "TaxFiling",
]
