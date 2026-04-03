from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BankAccountType(str, enum.Enum):
    current = "current"
    savings = "savings"
    deposit = "deposit"
    loan = "loan"
    credit_line = "credit_line"


class InstrumentType(str, enum.Enum):
    term_loan = "term_loan"
    revolving_credit = "revolving_credit"
    bond = "bond"
    overdraft = "overdraft"
    lease = "lease"
    other = "other"


class DebtStatus(str, enum.Enum):
    active = "active"
    repaid = "repaid"
    defaulted = "defaulted"


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    bank_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    iban: Mapped[str | None] = mapped_column(String(34), nullable=True)
    swift_bic: Mapped[str | None] = mapped_column(String(11), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    account_type: Mapped[BankAccountType] = mapped_column(Enum(BankAccountType), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    cash_positions = relationship("CashPosition", back_populates="bank_account", lazy="noload")


class CashPosition(Base):
    __tablename__ = "cash_positions"
    __table_args__ = (
        UniqueConstraint("bank_account_id", "balance_date", name="uq_cash_position_account_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    bank_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    balance_date: Mapped[date] = mapped_column(Date, nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    bank_account = relationship("BankAccount", back_populates="cash_positions", lazy="selectin")


class DebtInstrument(Base):
    __tablename__ = "debt_instruments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    instrument_type: Mapped[InstrumentType] = mapped_column(Enum(InstrumentType), nullable=False)
    lender: Mapped[str] = mapped_column(String(255), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    principal_amount: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    outstanding_amount: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    interest_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    maturity_date: Mapped[date] = mapped_column(Date, nullable=False)
    repayment_schedule: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[DebtStatus] = mapped_column(
        Enum(DebtStatus), nullable=False, default=DebtStatus.active
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


__all__ = [
    "BankAccountType",
    "InstrumentType",
    "DebtStatus",
    "BankAccount",
    "CashPosition",
    "DebtInstrument",
]
