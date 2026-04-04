from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ESGCategory(str, enum.Enum):
    environmental = "environmental"
    social = "social"
    governance = "governance"


class ESGFramework(str, enum.Enum):
    gri = "GRI"
    sasb = "SASB"
    tcfd = "TCFD"
    cdp = "CDP"


class ESGReportStatus(str, enum.Enum):
    draft = "draft"
    in_review = "in_review"
    published = "published"


class ESGMetric(Base):
    __tablename__ = "esg_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[ESGCategory] = mapped_column(Enum(ESGCategory), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(255), nullable=False)
    metric_value: Mapped[Decimal] = mapped_column(Numeric(16, 4), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    target_value: Mapped[Decimal | None] = mapped_column(Numeric(16, 4), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    site = relationship("Site", lazy="selectin")


class ESGReport(Base):
    __tablename__ = "esg_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    report_year: Mapped[int] = mapped_column(Integer, nullable=False)
    framework: Mapped[ESGFramework] = mapped_column(Enum(ESGFramework), nullable=False)
    status: Mapped[ESGReportStatus] = mapped_column(
        Enum(ESGReportStatus), nullable=False, default=ESGReportStatus.draft
    )
    published_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


__all__ = [
    "ESGCategory",
    "ESGFramework",
    "ESGReportStatus",
    "ESGMetric",
    "ESGReport",
]
