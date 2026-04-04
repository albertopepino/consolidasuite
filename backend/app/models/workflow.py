from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WorkflowStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    blocked = "blocked"
    skipped = "skipped"


class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    tasks = relationship("WorkflowTask", back_populates="template", lazy="selectin", cascade="all, delete-orphan")
    instances = relationship("WorkflowInstance", back_populates="template", lazy="noload")
    creator = relationship("User", lazy="selectin")


class WorkflowTask(Base):
    __tablename__ = "workflow_tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_templates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    depends_on_task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_tasks.id"), nullable=True
    )
    due_days_offset: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    template = relationship("WorkflowTemplate", back_populates="tasks")
    assigned_user = relationship("User", lazy="selectin")


class WorkflowInstance(Base):
    __tablename__ = "workflow_instances"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_templates.id"), nullable=False, index=True
    )
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[WorkflowStatus] = mapped_column(
        Enum(WorkflowStatus), nullable=False, default=WorkflowStatus.active
    )
    started_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    template = relationship("WorkflowTemplate", back_populates="instances", lazy="selectin")
    task_instances = relationship("TaskInstance", back_populates="workflow_instance", lazy="selectin", cascade="all, delete-orphan")
    starter = relationship("User", lazy="selectin")


class TaskInstance(Base):
    __tablename__ = "task_instances"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workflow_instance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_instances.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workflow_task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_tasks.id"), nullable=False
    )
    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus), nullable=False, default=TaskStatus.pending
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    workflow_instance = relationship("WorkflowInstance", back_populates="task_instances")
    workflow_task = relationship("WorkflowTask", lazy="selectin")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id], lazy="selectin")
    completer = relationship("User", foreign_keys=[completed_by], lazy="selectin")


__all__ = [
    "WorkflowStatus",
    "TaskStatus",
    "WorkflowTemplate",
    "WorkflowTask",
    "WorkflowInstance",
    "TaskInstance",
]
