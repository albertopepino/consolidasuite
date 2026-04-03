from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EntityType(str, enum.Enum):
    corporation = "corporation"
    llc = "llc"
    partnership = "partnership"
    branch = "branch"
    representative_office = "representative_office"
    other = "other"


class AuditStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    draft_report = "draft_report"
    final_report = "final_report"
    filed = "filed"


class AuditOpinion(str, enum.Enum):
    unqualified = "unqualified"
    qualified = "qualified"
    adverse = "adverse"
    disclaimer = "disclaimer"


class LegalEntity(Base):
    __tablename__ = "legal_entities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entity_name: Mapped[str] = mapped_column(String(255), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(100), nullable=False)
    tax_id: Mapped[str] = mapped_column(String(100), nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[EntityType] = mapped_column(Enum(EntityType), nullable=False)
    incorporation_date: Mapped[date] = mapped_column(Date, nullable=False)
    share_capital: Mapped[Decimal | None] = mapped_column(Numeric(16, 2), nullable=True)
    share_capital_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    parent_entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("legal_entities.id", ondelete="SET NULL"), nullable=True
    )
    ownership_percentage: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    registered_address: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    parent_entity = relationship("LegalEntity", remote_side="LegalEntity.id", lazy="selectin")
    directors = relationship("Director", back_populates="entity", lazy="noload")
    audits = relationship("StatutoryAudit", back_populates="entity", lazy="noload")


class Director(Base):
    __tablename__ = "directors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("legal_entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False)
    resignation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
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
    entity = relationship("LegalEntity", back_populates="directors", lazy="selectin")


class StatutoryAudit(Base):
    __tablename__ = "statutory_audits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("legal_entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    audit_firm: Mapped[str] = mapped_column(String(255), nullable=False)
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[AuditStatus] = mapped_column(
        Enum(AuditStatus), nullable=False, default=AuditStatus.not_started
    )
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    completion_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    opinion: Mapped[AuditOpinion | None] = mapped_column(Enum(AuditOpinion), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    entity = relationship("LegalEntity", back_populates="audits", lazy="selectin")


__all__ = [
    "EntityType",
    "AuditStatus",
    "AuditOpinion",
    "LegalEntity",
    "Director",
    "StatutoryAudit",
]
