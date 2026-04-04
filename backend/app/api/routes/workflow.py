from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuditLogger, CurrentUser, DbSession
from app.models.workflow import (
    TaskInstance,
    TaskStatus,
    WorkflowInstance,
    WorkflowStatus,
    WorkflowTask,
    WorkflowTemplate,
)
from app.schemas.workflow import (
    TaskInstanceResponse,
    TaskInstanceUpdate,
    WorkflowInstanceCreate,
    WorkflowInstanceListResponse,
    WorkflowInstanceResponse,
    WorkflowTemplateCreate,
    WorkflowTemplateListResponse,
    WorkflowTemplateResponse,
)

router = APIRouter(prefix="/workflow", tags=["workflow"])


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------


@router.get("/templates", response_model=WorkflowTemplateListResponse)
async def list_templates(
    db: DbSession,
    current_user: CurrentUser,
) -> WorkflowTemplateListResponse:
    """List all workflow templates."""
    result = await db.execute(
        select(WorkflowTemplate)
        .where(WorkflowTemplate.is_active == True)
        .order_by(WorkflowTemplate.name)
    )
    templates = result.scalars().all()
    return WorkflowTemplateListResponse(
        items=[WorkflowTemplateResponse.model_validate(t) for t in templates],
        total=len(templates),
    )


@router.post("/templates", response_model=WorkflowTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    body: WorkflowTemplateCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> WorkflowTemplateResponse:
    """Create a workflow template with tasks."""
    template = WorkflowTemplate(
        name=body.name,
        description=body.description,
        created_by=current_user.id,
    )
    db.add(template)
    await db.flush()

    for task_data in body.tasks:
        task = WorkflowTask(
            template_id=template.id,
            name=task_data.name,
            description=task_data.description,
            assigned_role=task_data.assigned_role,
            assigned_user_id=task_data.assigned_user_id,
            site_id=task_data.site_id,
            order_index=task_data.order_index,
            depends_on_task_id=task_data.depends_on_task_id,
            due_days_offset=task_data.due_days_offset,
        )
        db.add(task)

    await db.flush()
    await db.refresh(template)

    await audit_log(
        "create",
        "workflow_template",
        str(template.id),
        details={"name": body.name, "task_count": len(body.tasks)},
    )

    return WorkflowTemplateResponse.model_validate(template)


# ---------------------------------------------------------------------------
# Instances
# ---------------------------------------------------------------------------


@router.post("/instances", response_model=WorkflowInstanceResponse, status_code=status.HTTP_201_CREATED)
async def start_workflow(
    body: WorkflowInstanceCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> WorkflowInstanceResponse:
    """Start a workflow instance for a given period."""
    # Verify template exists
    result = await db.execute(
        select(WorkflowTemplate).where(WorkflowTemplate.id == body.template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow template not found")

    now = datetime.now(timezone.utc)
    instance = WorkflowInstance(
        template_id=body.template_id,
        period_year=body.period_year,
        period_month=body.period_month,
        started_at=now,
        started_by=current_user.id,
    )
    db.add(instance)
    await db.flush()

    # Create task instances from template tasks
    start_date = now.date()
    for task in sorted(template.tasks, key=lambda t: t.order_index):
        due = start_date + timedelta(days=task.due_days_offset)
        # Determine initial status based on dependencies
        initial_status = TaskStatus.pending
        if task.depends_on_task_id is not None:
            initial_status = TaskStatus.blocked

        task_instance = TaskInstance(
            workflow_instance_id=instance.id,
            workflow_task_id=task.id,
            assigned_user_id=task.assigned_user_id,
            status=initial_status,
            due_date=due,
        )
        db.add(task_instance)

    await db.flush()
    await db.refresh(instance)

    await audit_log(
        "create",
        "workflow_instance",
        str(instance.id),
        details={
            "template": template.name,
            "period": f"{body.period_year}-{body.period_month:02d}",
        },
    )

    return WorkflowInstanceResponse.model_validate(instance)


@router.get("/instances", response_model=WorkflowInstanceListResponse)
async def list_instances(
    db: DbSession,
    current_user: CurrentUser,
    year: int | None = Query(None, ge=2000, le=2100),
    month: int | None = Query(None, ge=1, le=12),
) -> WorkflowInstanceListResponse:
    """List workflow instances, optionally filtered by period."""
    stmt = select(WorkflowInstance).order_by(WorkflowInstance.created_at.desc())
    if year is not None:
        stmt = stmt.where(WorkflowInstance.period_year == year)
    if month is not None:
        stmt = stmt.where(WorkflowInstance.period_month == month)

    result = await db.execute(stmt)
    instances = result.scalars().all()
    return WorkflowInstanceListResponse(
        items=[WorkflowInstanceResponse.model_validate(i) for i in instances],
        total=len(instances),
    )


@router.get("/instances/{instance_id}", response_model=WorkflowInstanceResponse)
async def get_instance(
    instance_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> WorkflowInstanceResponse:
    """Get a workflow instance with all task statuses."""
    result = await db.execute(
        select(WorkflowInstance).where(WorkflowInstance.id == instance_id)
    )
    instance = result.scalar_one_or_none()
    if instance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow instance not found")

    return WorkflowInstanceResponse.model_validate(instance)


# ---------------------------------------------------------------------------
# Task instances
# ---------------------------------------------------------------------------


@router.put("/tasks/{task_instance_id}", response_model=TaskInstanceResponse)
async def update_task_instance(
    task_instance_id: uuid.UUID,
    body: TaskInstanceUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> TaskInstanceResponse:
    """Update a task instance (status, notes, assignment)."""
    result = await db.execute(
        select(TaskInstance).where(TaskInstance.id == task_instance_id)
    )
    task_inst = result.scalar_one_or_none()
    if task_inst is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task instance not found")

    now = datetime.now(timezone.utc)

    if body.status is not None:
        old_status = task_inst.status
        task_inst.status = body.status
        if body.status == TaskStatus.in_progress and task_inst.started_at is None:
            task_inst.started_at = now
        if body.status == TaskStatus.completed:
            task_inst.completed_at = now
            task_inst.completed_by = current_user.id

            # Unblock dependent tasks
            wf_task = task_inst.workflow_task
            if wf_task:
                dep_result = await db.execute(
                    select(TaskInstance)
                    .join(WorkflowTask, TaskInstance.workflow_task_id == WorkflowTask.id)
                    .where(
                        TaskInstance.workflow_instance_id == task_inst.workflow_instance_id,
                        WorkflowTask.depends_on_task_id == wf_task.id,
                        TaskInstance.status == TaskStatus.blocked,
                    )
                )
                for blocked_task in dep_result.scalars().all():
                    blocked_task.status = TaskStatus.pending

    if body.notes is not None:
        task_inst.notes = body.notes
    if body.assigned_user_id is not None:
        task_inst.assigned_user_id = body.assigned_user_id

    await db.flush()
    await db.refresh(task_inst)

    await audit_log(
        "update",
        "task_instance",
        str(task_inst.id),
        details={"status": task_inst.status.value},
    )

    return TaskInstanceResponse.model_validate(task_inst)


@router.get("/my-tasks", response_model=list[TaskInstanceResponse])
async def my_tasks(
    db: DbSession,
    current_user: CurrentUser,
) -> list[TaskInstanceResponse]:
    """Get tasks assigned to the current user across all active workflows."""
    result = await db.execute(
        select(TaskInstance)
        .join(WorkflowInstance, TaskInstance.workflow_instance_id == WorkflowInstance.id)
        .where(
            TaskInstance.assigned_user_id == current_user.id,
            WorkflowInstance.status == WorkflowStatus.active,
            TaskInstance.status.in_([TaskStatus.pending, TaskStatus.in_progress, TaskStatus.blocked]),
        )
        .order_by(TaskInstance.due_date.asc().nullslast())
    )
    tasks = result.scalars().all()
    return [TaskInstanceResponse.model_validate(t) for t in tasks]


__all__ = ["router"]
