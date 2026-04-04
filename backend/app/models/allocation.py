from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AllocationMethod(str, enum.Enum):
    percentage = "percentage"
    headcount = "headcount"
    revenue_based = "revenue_based"
    custom = "custom"


class AllocationRule(Base):
    __tablename__ = "allocation_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False, index=True
    )
    source_account_code: Mapped[str] = mapped_column(String(50), nullable=False)
    method: Mapped[AllocationMethod] = mapped_column(Enum(AllocationMethod), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    source_site = relationship("Site", lazy="selectin")
    targets = relationship("AllocationTarget", back_populates="rule", lazy="selectin", cascade="all, delete-orphan")
    results = relationship("AllocationResult", back_populates="rule", lazy="noload")
    creator = relationship("User", lazy="selectin")


class AllocationTarget(Base):
    __tablename__ = "allocation_targets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("allocation_rules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False
    )
    percentage: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    rule = relationship("AllocationRule", back_populates="targets")
    target_site = relationship("Site", lazy="selectin")


class AllocationResult(Base):
    __tablename__ = "allocation_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("allocation_rules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    source_amount: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    rule = relationship("AllocationRule", back_populates="results")


__all__ = [
    "AllocationMethod",
    "AllocationRule",
    "AllocationTarget",
    "AllocationResult",
]
