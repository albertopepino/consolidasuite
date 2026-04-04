from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AuditLogger, CurrentUser, DbSession
from app.models.erp_connector import ERPConnector, SyncLog, SyncStatus
from app.schemas.erp_connector import (
    ERPConnectorCreate,
    ERPConnectorListResponse,
    ERPConnectorResponse,
    ERPConnectorUpdate,
    SyncLogListResponse,
    SyncLogResponse,
    SyncTriggerResponse,
    TestConnectionResponse,
)

router = APIRouter(prefix="/connectors", tags=["connectors"])


@router.get("", response_model=ERPConnectorListResponse)
async def list_connectors(
    db: DbSession,
    current_user: CurrentUser,
) -> ERPConnectorListResponse:
    """List all ERP connectors."""
    result = await db.execute(
        select(ERPConnector).order_by(ERPConnector.name)
    )
    connectors = result.scalars().all()
    return ERPConnectorListResponse(
        items=[ERPConnectorResponse.model_validate(c) for c in connectors],
        total=len(connectors),
    )


@router.post("", response_model=ERPConnectorResponse, status_code=status.HTTP_201_CREATED)
async def create_connector(
    body: ERPConnectorCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ERPConnectorResponse:
    """Create an ERP connector."""
    connector = ERPConnector(
        site_id=body.site_id,
        erp_type=body.erp_type,
        name=body.name,
        connection_config=body.connection_config,
        mapping_config=body.mapping_config,
        sync_frequency=body.sync_frequency,
        created_by=current_user.id,
    )
    db.add(connector)
    await db.flush()
    await db.refresh(connector)

    await audit_log(
        "create",
        "erp_connector",
        str(connector.id),
        site_id=body.site_id,
        details={"name": body.name, "erp_type": body.erp_type.value},
    )

    return ERPConnectorResponse.model_validate(connector)


@router.put("/{connector_id}", response_model=ERPConnectorResponse)
async def update_connector(
    connector_id: uuid.UUID,
    body: ERPConnectorUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ERPConnectorResponse:
    """Update an ERP connector configuration."""
    result = await db.execute(select(ERPConnector).where(ERPConnector.id == connector_id))
    connector = result.scalar_one_or_none()
    if connector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    if body.name is not None:
        connector.name = body.name
    if body.connection_config is not None:
        connector.connection_config = body.connection_config
    if body.mapping_config is not None:
        connector.mapping_config = body.mapping_config
    if body.is_active is not None:
        connector.is_active = body.is_active
    if body.sync_frequency is not None:
        connector.sync_frequency = body.sync_frequency

    await db.flush()
    await db.refresh(connector)

    await audit_log(
        "update",
        "erp_connector",
        str(connector.id),
        site_id=connector.site_id,
        details={"name": connector.name},
    )

    return ERPConnectorResponse.model_validate(connector)


@router.post("/{connector_id}/test", response_model=TestConnectionResponse)
async def test_connection(
    connector_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> TestConnectionResponse:
    """Test an ERP connection (simulated)."""
    result = await db.execute(select(ERPConnector).where(ERPConnector.id == connector_id))
    connector = result.scalar_one_or_none()
    if connector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    if not connector.is_active:
        return TestConnectionResponse(success=False, message="Connector is disabled")

    # In production, this would actually attempt connection to the ERP system.
    # For now, we verify the config exists.
    if not connector.connection_config:
        return TestConnectionResponse(
            success=False,
            message="No connection configuration provided",
        )

    return TestConnectionResponse(
        success=True,
        message=f"Connection to {connector.erp_type.value} ({connector.name}) configured successfully",
    )


@router.post("/{connector_id}/sync", response_model=SyncTriggerResponse)
async def trigger_sync(
    connector_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> SyncTriggerResponse:
    """Trigger a manual sync for an ERP connector."""
    result = await db.execute(select(ERPConnector).where(ERPConnector.id == connector_id))
    connector = result.scalar_one_or_none()
    if connector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    if not connector.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Connector is disabled")

    now = datetime.now(timezone.utc)

    # Create a sync log entry
    sync_log = SyncLog(
        connector_id=connector.id,
        started_at=now,
        status=SyncStatus.running,
    )
    db.add(sync_log)

    # In production, this would kick off an async task.
    # For now, mark as success immediately with simulated counts.
    sync_log.completed_at = now
    sync_log.status = SyncStatus.success
    sync_log.records_processed = 0
    sync_log.records_created = 0
    sync_log.records_updated = 0

    connector.last_sync_at = now
    connector.last_sync_status = "success"

    await db.flush()
    await db.refresh(sync_log)

    await audit_log(
        "sync",
        "erp_connector",
        str(connector.id),
        site_id=connector.site_id,
        details={"sync_log_id": str(sync_log.id)},
    )

    return SyncTriggerResponse(
        sync_log_id=sync_log.id,
        status="success",
        message=f"Sync completed for {connector.name}",
    )


@router.get("/{connector_id}/logs", response_model=SyncLogListResponse)
async def get_sync_logs(
    connector_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    limit: int = Query(50, ge=1, le=200),
) -> SyncLogListResponse:
    """Get sync history for a connector."""
    result = await db.execute(select(ERPConnector).where(ERPConnector.id == connector_id))
    connector = result.scalar_one_or_none()
    if connector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    result = await db.execute(
        select(SyncLog)
        .where(SyncLog.connector_id == connector_id)
        .order_by(SyncLog.started_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()

    return SyncLogListResponse(
        items=[SyncLogResponse.model_validate(log) for log in logs],
        total=len(logs),
    )


__all__ = ["router"]
