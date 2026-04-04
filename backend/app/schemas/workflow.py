from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.workflow import TaskStatus, WorkflowStatus


# --- Workflow Task schemas ---

class WorkflowTaskCreate(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None
    assigned_role: str | None = Field(None, max_length=50)
    assigned_user_id: uuid.UUID | None = None
    site_id: uuid.UUID | None = None
    order_index: int = 0
    depends_on_task_id: uuid.UUID | None = None
    due_days_offset: int = 0


class WorkflowTaskResponse(BaseModel):
    id: uuid.UUID
    template_id: uuid.UUID
    name: str
    description: str | None
    assigned_role: str | None
    assigned_user_id: uuid.UUID | None
    site_id: uuid.UUID | None
    order_index: int
    depends_on_task_id: uuid.UUID | None
    due_days_offset: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Workflow Template schemas ---

class WorkflowTemplateCreate(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None
    tasks: list[WorkflowTaskCreate] = Field(default_factory=list)


class WorkflowTemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    is_active: bool
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    tasks: list[WorkflowTaskResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class WorkflowTemplateListResponse(BaseModel):
    items: list[WorkflowTemplateResponse]
    total: int


# --- Task Instance schemas ---

class TaskInstanceResponse(BaseModel):
    id: uuid.UUID
    workflow_instance_id: uuid.UUID
    workflow_task_id: uuid.UUID
    assigned_user_id: uuid.UUID | None
    status: TaskStatus
    started_at: datetime | None
    completed_at: datetime | None
    completed_by: uuid.UUID | None
    notes: str | None
    due_date: date | None
    created_at: datetime
    workflow_task: WorkflowTaskResponse | None = None

    model_config = {"from_attributes": True}


class TaskInstanceUpdate(BaseModel):
    status: TaskStatus | None = None
    notes: str | None = None
    assigned_user_id: uuid.UUID | None = None


# --- Workflow Instance schemas ---

class WorkflowInstanceCreate(BaseModel):
    template_id: uuid.UUID
    period_year: int = Field(ge=2000, le=2100)
    period_month: int = Field(ge=1, le=12)


class WorkflowInstanceResponse(BaseModel):
    id: uuid.UUID
    template_id: uuid.UUID
    period_year: int
    period_month: int
    started_at: datetime
    completed_at: datetime | None
    status: WorkflowStatus
    started_by: uuid.UUID
    created_at: datetime
    task_instances: list[TaskInstanceResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class WorkflowInstanceListResponse(BaseModel):
    items: list[WorkflowInstanceResponse]
    total: int


__all__ = [
    "WorkflowTaskCreate",
    "WorkflowTaskResponse",
    "WorkflowTemplateCreate",
    "WorkflowTemplateResponse",
    "WorkflowTemplateListResponse",
    "TaskInstanceResponse",
    "TaskInstanceUpdate",
    "WorkflowInstanceCreate",
    "WorkflowInstanceResponse",
    "WorkflowInstanceListResponse",
]
