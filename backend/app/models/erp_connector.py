from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ERPType(str, enum.Enum):
    sap = "sap"
    oracle = "oracle"
    netsuite = "netsuite"
    workday = "workday"
    dynamics365 = "dynamics365"
    sage = "sage"
    xero = "xero"
    quickbooks = "quickbooks"
    csv_import = "csv_import"
    api = "api"


class SyncStatus(str, enum.Enum):
    running = "running"
    success = "success"
    failed = "failed"
    partial = "partial"


class ERPConnector(Base):
    __tablename__ = "erp_connectors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    erp_type: Mapped[ERPType] = mapped_column(Enum(ERPType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    connection_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    mapping_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sync_frequency: Mapped[str | None] = mapped_column(String(50), nullable=True)
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
    sync_logs = relationship("SyncLog", back_populates="connector", lazy="noload", cascade="all, delete-orphan")
    creator = relationship("User", lazy="selectin")


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    connector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("erp_connectors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SyncStatus] = mapped_column(
        Enum(SyncStatus), nullable=False, default=SyncStatus.running
    )
    records_processed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_created: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_updated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    errors: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    connector = relationship("ERPConnector", back_populates="sync_logs")


__all__ = [
    "ERPType",
    "SyncStatus",
    "ERPConnector",
    "SyncLog",
]
