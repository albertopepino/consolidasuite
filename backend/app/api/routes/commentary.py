from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AuditLogger, CurrentUser, DbSession, require_site_access
from app.models.commentary import Commentary
from app.schemas.commentary import (
    CommentaryCreate,
    CommentaryListResponse,
    CommentaryResponse,
    CommentaryUpdate,
)

router = APIRouter(prefix="/commentary", tags=["commentary"])


@router.get("", response_model=CommentaryListResponse)
async def list_commentaries(
    db: DbSession,
    current_user: CurrentUser,
    site_id: uuid.UUID | None = Query(None),
    period_year: int | None = Query(None, ge=2000, le=2100),
    period_month: int | None = Query(None, ge=1, le=12),
    line_item_code: str | None = Query(None, max_length=50),
) -> CommentaryListResponse:
    """List commentary notes with optional filters."""
    stmt = select(Commentary)

    if site_id is not None:
        await require_site_access(site_id, current_user)
        stmt = stmt.where(Commentary.site_id == site_id)
    else:
        # Filter for consolidated (null site_id) if no site specified
        pass

    if period_year is not None:
        stmt = stmt.where(Commentary.period_year == period_year)
    if period_month is not None:
        stmt = stmt.where(Commentary.period_month == period_month)
    if line_item_code is not None:
        stmt = stmt.where(Commentary.line_item_code == line_item_code)

    stmt = stmt.order_by(Commentary.created_at.desc())

    result = await db.execute(stmt)
    items = result.scalars().all()

    return CommentaryListResponse(
        items=[CommentaryResponse.model_validate(c) for c in items],
        total=len(items),
    )


@router.get("/{commentary_id}", response_model=CommentaryResponse)
async def get_commentary(
    commentary_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> CommentaryResponse:
    """Get a single commentary note by ID."""
    result = await db.execute(select(Commentary).where(Commentary.id == commentary_id))
    commentary = result.scalar_one_or_none()
    if commentary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commentary not found")

    if commentary.site_id is not None:
        await require_site_access(commentary.site_id, current_user)

    return CommentaryResponse.model_validate(commentary)


@router.post("", response_model=CommentaryResponse, status_code=status.HTTP_201_CREATED)
async def create_commentary(
    body: CommentaryCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> CommentaryResponse:
    """Create a new commentary note."""
    if body.site_id is not None:
        await require_site_access(body.site_id, current_user)

    commentary = Commentary(
        site_id=body.site_id,
        period_year=body.period_year,
        period_month=body.period_month,
        line_item_code=body.line_item_code,
        note=body.note,
        created_by=current_user.id,
    )
    db.add(commentary)
    await db.flush()
    await db.refresh(commentary)

    await audit_log(
        "create",
        "commentary",
        str(commentary.id),
        site_id=body.site_id,
        details={
            "line_item_code": body.line_item_code,
            "period": f"{body.period_year}-{body.period_month:02d}",
        },
    )

    return CommentaryResponse.model_validate(commentary)


@router.put("/{commentary_id}", response_model=CommentaryResponse)
async def update_commentary(
    commentary_id: uuid.UUID,
    body: CommentaryUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> CommentaryResponse:
    """Update a commentary note (only by its creator)."""
    result = await db.execute(select(Commentary).where(Commentary.id == commentary_id))
    commentary = result.scalar_one_or_none()
    if commentary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commentary not found")

    if commentary.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author can edit this commentary",
        )

    commentary.note = body.note
    await db.flush()
    await db.refresh(commentary)

    await audit_log(
        "update",
        "commentary",
        str(commentary.id),
        site_id=commentary.site_id,
        details={"new_note_length": len(body.note)},
    )

    return CommentaryResponse.model_validate(commentary)


@router.delete("/{commentary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_commentary(
    commentary_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> None:
    """Delete a commentary note (only by its creator)."""
    result = await db.execute(select(Commentary).where(Commentary.id == commentary_id))
    commentary = result.scalar_one_or_none()
    if commentary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commentary not found")

    if commentary.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author can delete this commentary",
        )

    await audit_log("delete", "commentary", str(commentary.id), site_id=commentary.site_id)

    await db.delete(commentary)
    await db.flush()


__all__ = ["router"]
