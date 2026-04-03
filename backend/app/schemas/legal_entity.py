from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.legal_entity import AuditOpinion, AuditStatus, EntityType


# ---------------------------------------------------------------------------
# Legal Entity
# ---------------------------------------------------------------------------


class LegalEntityCreate(BaseModel):
    site_id: uuid.UUID
    entity_name: str = Field(max_length=255)
    registration_number: str = Field(max_length=100)
    tax_id: str = Field(max_length=100)
    jurisdiction: str = Field(max_length=100)
    entity_type: EntityType
    incorporation_date: date
    share_capital: Decimal | None = None
    share_capital_currency: str | None = Field(None, max_length=3)
    parent_entity_id: uuid.UUID | None = None
    ownership_percentage: Decimal | None = Field(None, ge=0, le=100)
    registered_address: str | None = None


class LegalEntityUpdate(BaseModel):
    entity_name: str | None = Field(None, max_length=255)
    registration_number: str | None = Field(None, max_length=100)
    tax_id: str | None = Field(None, max_length=100)
    jurisdiction: str | None = Field(None, max_length=100)
    entity_type: EntityType | None = None
    share_capital: Decimal | None = None
    share_capital_currency: str | None = Field(None, max_length=3)
    parent_entity_id: uuid.UUID | None = None
    ownership_percentage: Decimal | None = Field(None, ge=0, le=100)
    registered_address: str | None = None
    is_active: bool | None = None


class LegalEntityResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    entity_name: str
    registration_number: str
    tax_id: str
    jurisdiction: str
    entity_type: EntityType
    incorporation_date: date
    share_capital: Decimal | None
    share_capital_currency: str | None
    parent_entity_id: uuid.UUID | None
    ownership_percentage: Decimal | None
    registered_address: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LegalEntityListResponse(BaseModel):
    items: list[LegalEntityResponse]
    total: int


# ---------------------------------------------------------------------------
# Director
# ---------------------------------------------------------------------------


class DirectorCreate(BaseModel):
    full_name: str = Field(max_length=255)
    role: str = Field(max_length=100)
    appointment_date: date
    resignation_date: date | None = None
    nationality: str | None = Field(None, max_length=100)
    is_active: bool = True


class DirectorResponse(BaseModel):
    id: uuid.UUID
    entity_id: uuid.UUID
    full_name: str
    role: str
    appointment_date: date
    resignation_date: date | None
    nationality: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DirectorListResponse(BaseModel):
    items: list[DirectorResponse]
    total: int


# ---------------------------------------------------------------------------
# Statutory Audit
# ---------------------------------------------------------------------------


class StatutoryAuditCreate(BaseModel):
    entity_id: uuid.UUID
    audit_firm: str = Field(max_length=255)
    fiscal_year: int = Field(ge=2000, le=2100)
    status: AuditStatus = AuditStatus.not_started
    due_date: date
    completion_date: date | None = None
    opinion: AuditOpinion | None = None
    notes: str | None = None


class StatutoryAuditUpdate(BaseModel):
    status: AuditStatus | None = None
    completion_date: date | None = None
    opinion: AuditOpinion | None = None
    notes: str | None = None


class StatutoryAuditResponse(BaseModel):
    id: uuid.UUID
    entity_id: uuid.UUID
    audit_firm: str
    fiscal_year: int
    status: AuditStatus
    due_date: date
    completion_date: date | None
    opinion: AuditOpinion | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StatutoryAuditListResponse(BaseModel):
    items: list[StatutoryAuditResponse]
    total: int


# ---------------------------------------------------------------------------
# Ownership Structure Tree
# ---------------------------------------------------------------------------


class EntityTreeNode(BaseModel):
    id: uuid.UUID
    entity_name: str
    entity_type: EntityType
    jurisdiction: str
    ownership_percentage: Decimal | None
    children: list[EntityTreeNode] = []


# Rebuild for self-reference
EntityTreeNode.model_rebuild()


class OwnershipStructureResponse(BaseModel):
    roots: list[EntityTreeNode]


__all__ = [
    "LegalEntityCreate",
    "LegalEntityUpdate",
    "LegalEntityResponse",
    "LegalEntityListResponse",
    "DirectorCreate",
    "DirectorResponse",
    "DirectorListResponse",
    "StatutoryAuditCreate",
    "StatutoryAuditUpdate",
    "StatutoryAuditResponse",
    "StatutoryAuditListResponse",
    "EntityTreeNode",
    "OwnershipStructureResponse",
]
