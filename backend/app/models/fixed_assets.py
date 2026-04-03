from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AssetCategory(str, enum.Enum):
    land = "land"
    buildings = "buildings"
    machinery = "machinery"
    vehicles = "vehicles"
    furniture = "furniture"
    it_equipment = "it_equipment"
    intangible = "intangible"
    other = "other"


class DepreciationMethod(str, enum.Enum):
    straight_line = "straight_line"
    declining_balance = "declining_balance"
    units_of_production = "units_of_production"


class AssetStatus(str, enum.Enum):
    active = "active"
    fully_depreciated = "fully_depreciated"
    disposed = "disposed"
    impaired = "impaired"


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (
        UniqueConstraint("site_id", "asset_code", name="uq_asset_site_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[AssetCategory] = mapped_column(Enum(AssetCategory), nullable=False)
    acquisition_date: Mapped[date] = mapped_column(Date, nullable=False)
    acquisition_cost: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    useful_life_months: Mapped[int] = mapped_column(Integer, nullable=False)
    depreciation_method: Mapped[DepreciationMethod] = mapped_column(
        Enum(DepreciationMethod), nullable=False, default=DepreciationMethod.straight_line
    )
    residual_value: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False, default=0)
    accumulated_depreciation: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False, default=0)
    net_book_value: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    disposal_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    disposal_amount: Mapped[Decimal | None] = mapped_column(Numeric(16, 2), nullable=True)
    status: Mapped[AssetStatus] = mapped_column(
        Enum(AssetStatus), nullable=False, default=AssetStatus.active
    )
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
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
    "Asset",
    "AssetCategory",
    "AssetStatus",
    "DepreciationMethod",
]
