from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.erp_connector import ERPType, SyncStatus


# --- ERP Connector schemas ---

class ERPConnectorCreate(BaseModel):
    site_id: uuid.UUID
    erp_type: ERPType
    name: str = Field(max_length=255)
    connection_config: dict | None = None
    mapping_config: dict | None = None
    sync_frequency: str | None = Field(None, max_length=50)


class ERPConnectorUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    connection_config: dict | None = None
    mapping_config: dict | None = None
    is_active: bool | None = None
    sync_frequency: str | None = Field(None, max_length=50)


class ERPConnectorResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    erp_type: ERPType
    name: str
    connection_config: dict | None
    mapping_config: dict | None
    is_active: bool
    last_sync_at: datetime | None
    last_sync_status: str | None
    sync_frequency: str | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ERPConnectorListResponse(BaseModel):
    items: list[ERPConnectorResponse]
    total: int


# --- Sync Log schemas ---

class SyncLogResponse(BaseModel):
    id: uuid.UUID
    connector_id: uuid.UUID
    started_at: datetime
    completed_at: datetime | None
    status: SyncStatus
    records_processed: int
    records_created: int
    records_updated: int
    errors: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SyncLogListResponse(BaseModel):
    items: list[SyncLogResponse]
    total: int


class TestConnectionResponse(BaseModel):
    success: bool
    message: str


class SyncTriggerResponse(BaseModel):
    sync_log_id: uuid.UUID
    status: str
    message: str


__all__ = [
    "ERPConnectorCreate",
    "ERPConnectorUpdate",
    "ERPConnectorResponse",
    "ERPConnectorListResponse",
    "SyncLogResponse",
    "SyncLogListResponse",
    "TestConnectionResponse",
    "SyncTriggerResponse",
]
