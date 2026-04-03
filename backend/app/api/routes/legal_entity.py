from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AuditLogger, CurrentUser, DbSession
from app.models.legal_entity import (
    AuditStatus,
    Director,
    EntityType,
    LegalEntity,
    StatutoryAudit,
)
from app.schemas.legal_entity import (
    DirectorCreate,
    DirectorListResponse,
    DirectorResponse,
    EntityTreeNode,
    LegalEntityCreate,
    LegalEntityListResponse,
    LegalEntityResponse,
    LegalEntityUpdate,
    OwnershipStructureResponse,
    StatutoryAuditCreate,
    StatutoryAuditListResponse,
    StatutoryAuditResponse,
    StatutoryAuditUpdate,
)

router = APIRouter(prefix="/legal", tags=["legal"])


# ---------------------------------------------------------------------------
# Legal Entities
# ---------------------------------------------------------------------------


@router.get("/entities", response_model=LegalEntityListResponse)
async def list_entities(
    db: DbSession,
    current_user: CurrentUser,
) -> LegalEntityListResponse:
    """List all legal entities."""
    result = await db.execute(
        select(LegalEntity).order_by(LegalEntity.entity_name)
    )
    items = result.scalars().all()
    return LegalEntityListResponse(
        items=[LegalEntityResponse.model_validate(e) for e in items],
        total=len(items),
    )


@router.post("/entities", response_model=LegalEntityResponse, status_code=status.HTTP_201_CREATED)
async def create_entity(
    body: LegalEntityCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> LegalEntityResponse:
    """Create a new legal entity."""
    entity = LegalEntity(
        site_id=body.site_id,
        entity_name=body.entity_name,
        registration_number=body.registration_number,
        tax_id=body.tax_id,
        jurisdiction=body.jurisdiction,
        entity_type=body.entity_type,
        incorporation_date=body.incorporation_date,
        share_capital=body.share_capital,
        share_capital_currency=body.share_capital_currency,
        parent_entity_id=body.parent_entity_id,
        ownership_percentage=body.ownership_percentage,
        registered_address=body.registered_address,
    )
    db.add(entity)
    await db.flush()
    await db.refresh(entity)

    await audit_log(
        "create",
        "legal_entity",
        str(entity.id),
        site_id=body.site_id,
        details={"entity_name": body.entity_name, "jurisdiction": body.jurisdiction},
    )

    return LegalEntityResponse.model_validate(entity)


@router.put("/entities/{entity_id}", response_model=LegalEntityResponse)
async def update_entity(
    entity_id: uuid.UUID,
    body: LegalEntityUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> LegalEntityResponse:
    """Update a legal entity."""
    result = await db.execute(select(LegalEntity).where(LegalEntity.id == entity_id))
    entity = result.scalar_one_or_none()
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Legal entity not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entity, field, value)

    await db.flush()
    await db.refresh(entity)

    await audit_log(
        "update",
        "legal_entity",
        str(entity.id),
        site_id=entity.site_id,
        details=update_data,
    )

    return LegalEntityResponse.model_validate(entity)


# ---------------------------------------------------------------------------
# Directors
# ---------------------------------------------------------------------------


@router.get("/entities/{entity_id}/directors", response_model=DirectorListResponse)
async def list_directors(
    entity_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> DirectorListResponse:
    """List directors for an entity."""
    result = await db.execute(
        select(Director)
        .where(Director.entity_id == entity_id)
        .order_by(Director.appointment_date.desc())
    )
    items = result.scalars().all()
    return DirectorListResponse(
        items=[DirectorResponse.model_validate(d) for d in items],
        total=len(items),
    )


@router.post("/entities/{entity_id}/directors", response_model=DirectorResponse, status_code=status.HTTP_201_CREATED)
async def add_director(
    entity_id: uuid.UUID,
    body: DirectorCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> DirectorResponse:
    """Add a director to an entity."""
    # Verify entity exists
    entity_result = await db.execute(select(LegalEntity).where(LegalEntity.id == entity_id))
    entity = entity_result.scalar_one_or_none()
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Legal entity not found")

    director = Director(
        entity_id=entity_id,
        full_name=body.full_name,
        role=body.role,
        appointment_date=body.appointment_date,
        resignation_date=body.resignation_date,
        nationality=body.nationality,
        is_active=body.is_active,
    )
    db.add(director)
    await db.flush()
    await db.refresh(director)

    await audit_log(
        "create",
        "director",
        str(director.id),
        site_id=entity.site_id,
        details={"full_name": body.full_name, "role": body.role},
    )

    return DirectorResponse.model_validate(director)


# ---------------------------------------------------------------------------
# Statutory Audits
# ---------------------------------------------------------------------------


@router.get("/audits", response_model=StatutoryAuditListResponse)
async def list_audits(
    db: DbSession,
    current_user: CurrentUser,
    year: int | None = Query(None, ge=2000, le=2100),
) -> StatutoryAuditListResponse:
    """List statutory audits with optional year filter."""
    stmt = select(StatutoryAudit)
    if year is not None:
        stmt = stmt.where(StatutoryAudit.fiscal_year == year)
    stmt = stmt.order_by(StatutoryAudit.due_date.desc())

    result = await db.execute(stmt)
    items = result.scalars().all()
    return StatutoryAuditListResponse(
        items=[StatutoryAuditResponse.model_validate(a) for a in items],
        total=len(items),
    )


@router.post("/audits", response_model=StatutoryAuditResponse, status_code=status.HTTP_201_CREATED)
async def create_audit(
    body: StatutoryAuditCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> StatutoryAuditResponse:
    """Create a statutory audit record."""
    # Verify entity exists
    entity_result = await db.execute(select(LegalEntity).where(LegalEntity.id == body.entity_id))
    entity = entity_result.scalar_one_or_none()
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Legal entity not found")

    audit_record = StatutoryAudit(
        entity_id=body.entity_id,
        audit_firm=body.audit_firm,
        fiscal_year=body.fiscal_year,
        status=body.status,
        due_date=body.due_date,
        completion_date=body.completion_date,
        opinion=body.opinion,
        notes=body.notes,
    )
    db.add(audit_record)
    await db.flush()
    await db.refresh(audit_record)

    await audit_log(
        "create",
        "statutory_audit",
        str(audit_record.id),
        site_id=entity.site_id,
        details={"audit_firm": body.audit_firm, "fiscal_year": body.fiscal_year},
    )

    return StatutoryAuditResponse.model_validate(audit_record)


@router.put("/audits/{audit_id}", response_model=StatutoryAuditResponse)
async def update_audit(
    audit_id: uuid.UUID,
    body: StatutoryAuditUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> StatutoryAuditResponse:
    """Update a statutory audit status."""
    result = await db.execute(select(StatutoryAudit).where(StatutoryAudit.id == audit_id))
    audit_record = result.scalar_one_or_none()
    if audit_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statutory audit not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(audit_record, field, value)

    await db.flush()
    await db.refresh(audit_record)

    # Get entity for site_id in audit log
    entity_result = await db.execute(select(LegalEntity).where(LegalEntity.id == audit_record.entity_id))
    entity = entity_result.scalar_one_or_none()

    await audit_log(
        "update",
        "statutory_audit",
        str(audit_record.id),
        site_id=entity.site_id if entity else None,
        details=update_data,
    )

    return StatutoryAuditResponse.model_validate(audit_record)


# ---------------------------------------------------------------------------
# Ownership Structure Tree
# ---------------------------------------------------------------------------


@router.get("/structure", response_model=OwnershipStructureResponse)
async def ownership_structure(
    db: DbSession,
    current_user: CurrentUser,
) -> OwnershipStructureResponse:
    """Ownership structure tree (entities with parent relationships)."""
    result = await db.execute(
        select(LegalEntity).where(LegalEntity.is_active.is_(True)).order_by(LegalEntity.entity_name)
    )
    entities = result.scalars().all()

    # Build lookup and children map
    entity_map: dict[uuid.UUID, LegalEntity] = {e.id: e for e in entities}
    children_map: dict[uuid.UUID | None, list[LegalEntity]] = {}
    for e in entities:
        children_map.setdefault(e.parent_entity_id, []).append(e)

    def _build_tree(entity: LegalEntity) -> EntityTreeNode:
        children = children_map.get(entity.id, [])
        return EntityTreeNode(
            id=entity.id,
            entity_name=entity.entity_name,
            entity_type=entity.entity_type,
            jurisdiction=entity.jurisdiction,
            ownership_percentage=entity.ownership_percentage,
            children=[_build_tree(c) for c in children],
        )

    # Roots are entities with no parent or whose parent is not in active entities
    roots = children_map.get(None, [])
    # Also include entities whose parent_entity_id is set but parent doesn't exist in active set
    for e in entities:
        if e.parent_entity_id is not None and e.parent_entity_id not in entity_map:
            roots.append(e)

    return OwnershipStructureResponse(
        roots=[_build_tree(r) for r in roots],
    )


__all__ = ["router"]
