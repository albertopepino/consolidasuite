from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LeaseType(str, enum.Enum):
    operating = "operating"
    finance = "finance"


class LeaseStandard(str, enum.Enum):
    ifrs16 = "IFRS16"
    asc842 = "ASC842"


class LeaseStatus(str, enum.Enum):
    active = "active"
    expired = "expired"
    terminated = "terminated"


class Lease(Base):
    __tablename__ = "leases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_description: Mapped[str] = mapped_column(String(500), nullable=False)
    lease_type: Mapped[LeaseType] = mapped_column(Enum(LeaseType), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    monthly_payment: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    discount_rate: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    right_of_use_asset: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False, default=0)
    lease_liability: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False, default=0)
    standard: Mapped[LeaseStandard] = mapped_column(Enum(LeaseStandard), nullable=False, default=LeaseStandard.ifrs16)
    status: Mapped[LeaseStatus] = mapped_column(Enum(LeaseStatus), nullable=False, default=LeaseStatus.active)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    site = relationship("Site", lazy="selectin")


__all__ = [
    "LeaseType",
    "LeaseStandard",
    "LeaseStatus",
    "Lease",
]
