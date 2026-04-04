from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AuditLogger, CurrentUser, DbSession, require_site_access
from app.models.lease import Lease, LeaseStatus
from app.schemas.lease import (
    LeaseCreate,
    LeaseListResponse,
    LeaseResponse,
    LeaseUpdate,
)

router = APIRouter(prefix="/leases", tags=["leases"])


@router.get("/site/{site_id}", response_model=LeaseListResponse)
async def list_leases(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    lease_status: LeaseStatus | None = Query(None, alias="status"),
) -> LeaseListResponse:
    """List leases for a site."""
    await require_site_access(site_id, current_user)

    stmt = select(Lease).where(Lease.site_id == site_id)
    if lease_status is not None:
        stmt = stmt.where(Lease.status == lease_status)
    stmt = stmt.order_by(Lease.start_date.desc())

    result = await db.execute(stmt)
    leases = result.scalars().all()
    return LeaseListResponse(
        items=[LeaseResponse.model_validate(l) for l in leases],
        total=len(leases),
    )


@router.get("/{lease_id}", response_model=LeaseResponse)
async def get_lease(
    lease_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> LeaseResponse:
    """Get a lease by ID."""
    result = await db.execute(select(Lease).where(Lease.id == lease_id))
    lease = result.scalar_one_or_none()
    if lease is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lease not found")
    await require_site_access(lease.site_id, current_user)
    return LeaseResponse.model_validate(lease)


@router.post("", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
async def create_lease(
    body: LeaseCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> LeaseResponse:
    """Create a lease."""
    await require_site_access(body.site_id, current_user)

    lease = Lease(
        site_id=body.site_id,
        asset_description=body.asset_description,
        lease_type=body.lease_type,
        start_date=body.start_date,
        end_date=body.end_date,
        monthly_payment=body.monthly_payment,
        discount_rate=body.discount_rate,
        right_of_use_asset=body.right_of_use_asset,
        lease_liability=body.lease_liability,
        standard=body.standard,
    )
    db.add(lease)
    await db.flush()
    await db.refresh(lease)

    await audit_log(
        "create",
        "lease",
        str(lease.id),
        site_id=body.site_id,
        details={"asset": body.asset_description, "type": body.lease_type.value},
    )

    return LeaseResponse.model_validate(lease)


@router.put("/{lease_id}", response_model=LeaseResponse)
async def update_lease(
    lease_id: uuid.UUID,
    body: LeaseUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> LeaseResponse:
    """Update a lease."""
    result = await db.execute(select(Lease).where(Lease.id == lease_id))
    lease = result.scalar_one_or_none()
    if lease is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lease not found")

    await require_site_access(lease.site_id, current_user)

    if body.asset_description is not None:
        lease.asset_description = body.asset_description
    if body.monthly_payment is not None:
        lease.monthly_payment = body.monthly_payment
    if body.right_of_use_asset is not None:
        lease.right_of_use_asset = body.right_of_use_asset
    if body.lease_liability is not None:
        lease.lease_liability = body.lease_liability
    if body.status is not None:
        lease.status = body.status

    await db.flush()
    await db.refresh(lease)

    await audit_log(
        "update",
        "lease",
        str(lease.id),
        site_id=lease.site_id,
        details={"status": lease.status.value},
    )

    return LeaseResponse.model_validate(lease)


@router.delete("/{lease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lease(
    lease_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> None:
    """Delete a lease."""
    result = await db.execute(select(Lease).where(Lease.id == lease_id))
    lease = result.scalar_one_or_none()
    if lease is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lease not found")

    await require_site_access(lease.site_id, current_user)
    await audit_log("delete", "lease", str(lease.id), site_id=lease.site_id)
    await db.delete(lease)
    await db.flush()


__all__ = ["router"]
