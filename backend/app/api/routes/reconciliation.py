from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AuditLogger, CurrentUser, DbSession, require_site_access
from app.models.reconciliation import ReconciliationItem, ReconciliationRule, ReconciliationStatus
from app.schemas.reconciliation import (
    ReconciliationItemCreate,
    ReconciliationItemListResponse,
    ReconciliationItemResponse,
    ReconciliationItemUpdate,
    ReconciliationRuleCreate,
    ReconciliationRuleListResponse,
    ReconciliationRuleResponse,
)

router = APIRouter(prefix="/reconciliation", tags=["reconciliation"])


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------


@router.get("/rules", response_model=ReconciliationRuleListResponse)
async def list_rules(
    db: DbSession,
    current_user: CurrentUser,
) -> ReconciliationRuleListResponse:
    """List all reconciliation rules."""
    result = await db.execute(
        select(ReconciliationRule)
        .where(ReconciliationRule.is_active == True)
        .order_by(ReconciliationRule.name)
    )
    rules = result.scalars().all()
    return ReconciliationRuleListResponse(
        items=[ReconciliationRuleResponse.model_validate(r) for r in rules],
        total=len(rules),
    )


@router.post("/rules", response_model=ReconciliationRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    body: ReconciliationRuleCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ReconciliationRuleResponse:
    """Create a reconciliation rule."""
    rule = ReconciliationRule(
        name=body.name,
        account_code=body.account_code,
        match_criteria=body.match_criteria,
        created_by=current_user.id,
    )
    db.add(rule)
    await db.flush()
    await db.refresh(rule)

    await audit_log(
        "create",
        "reconciliation_rule",
        str(rule.id),
        details={"name": body.name, "account_code": body.account_code},
    )

    return ReconciliationRuleResponse.model_validate(rule)


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------


@router.get("/items", response_model=ReconciliationItemListResponse)
async def list_items(
    db: DbSession,
    current_user: CurrentUser,
    site_id: uuid.UUID | None = Query(None),
    account_code: str | None = Query(None),
    period_year: int | None = Query(None, ge=2000, le=2100),
    period_month: int | None = Query(None, ge=1, le=12),
    item_status: ReconciliationStatus | None = Query(None, alias="status"),
) -> ReconciliationItemListResponse:
    """List reconciliation items with optional filters."""
    stmt = select(ReconciliationItem)
    if site_id is not None:
        stmt = stmt.where(ReconciliationItem.site_id == site_id)
    if account_code is not None:
        stmt = stmt.where(ReconciliationItem.account_code == account_code)
    if period_year is not None:
        stmt = stmt.where(ReconciliationItem.period_year == period_year)
    if period_month is not None:
        stmt = stmt.where(ReconciliationItem.period_month == period_month)
    if item_status is not None:
        stmt = stmt.where(ReconciliationItem.status == item_status)

    stmt = stmt.order_by(ReconciliationItem.transaction_date.desc())
    result = await db.execute(stmt)
    items = result.scalars().all()

    return ReconciliationItemListResponse(
        items=[ReconciliationItemResponse.model_validate(i) for i in items],
        total=len(items),
    )


@router.post("/items", response_model=ReconciliationItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    body: ReconciliationItemCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ReconciliationItemResponse:
    """Create a reconciliation item."""
    await require_site_access(body.site_id, current_user)

    item = ReconciliationItem(
        site_id=body.site_id,
        account_code=body.account_code,
        period_year=body.period_year,
        period_month=body.period_month,
        source=body.source,
        reference=body.reference,
        amount=body.amount,
        transaction_date=body.transaction_date,
        description=body.description,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)

    await audit_log(
        "create",
        "reconciliation_item",
        str(item.id),
        site_id=body.site_id,
        details={"account_code": body.account_code, "amount": str(body.amount)},
    )

    return ReconciliationItemResponse.model_validate(item)


@router.put("/items/{item_id}", response_model=ReconciliationItemResponse)
async def update_item(
    item_id: uuid.UUID,
    body: ReconciliationItemUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ReconciliationItemResponse:
    """Update a reconciliation item (status, matching)."""
    result = await db.execute(select(ReconciliationItem).where(ReconciliationItem.id == item_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation item not found")

    if body.status is not None:
        item.status = body.status
    if body.matched_with_id is not None:
        item.matched_with_id = body.matched_with_id
        item.status = ReconciliationStatus.matched
        # Also mark the matched counterpart
        match_result = await db.execute(
            select(ReconciliationItem).where(ReconciliationItem.id == body.matched_with_id)
        )
        counterpart = match_result.scalar_one_or_none()
        if counterpart:
            counterpart.matched_with_id = item.id
            counterpart.status = ReconciliationStatus.matched

    await db.flush()
    await db.refresh(item)

    await audit_log(
        "update",
        "reconciliation_item",
        str(item.id),
        site_id=item.site_id,
        details={"status": item.status.value},
    )

    return ReconciliationItemResponse.model_validate(item)


__all__ = ["router"]
