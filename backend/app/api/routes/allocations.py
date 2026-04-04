from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AuditLogger, CurrentUser, DbSession
from app.models.allocation import AllocationResult, AllocationRule, AllocationTarget
from app.schemas.allocation import (
    AllocationExecute,
    AllocationResultListResponse,
    AllocationResultResponse,
    AllocationRuleCreate,
    AllocationRuleListResponse,
    AllocationRuleResponse,
    AllocationRuleUpdate,
)

router = APIRouter(prefix="/allocations", tags=["allocations"])


@router.get("/rules", response_model=AllocationRuleListResponse)
async def list_rules(
    db: DbSession,
    current_user: CurrentUser,
) -> AllocationRuleListResponse:
    """List all allocation rules."""
    result = await db.execute(
        select(AllocationRule)
        .where(AllocationRule.is_active == True)
        .order_by(AllocationRule.name)
    )
    rules = result.scalars().all()
    return AllocationRuleListResponse(
        items=[AllocationRuleResponse.model_validate(r) for r in rules],
        total=len(rules),
    )


@router.get("/rules/{rule_id}", response_model=AllocationRuleResponse)
async def get_rule(
    rule_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> AllocationRuleResponse:
    """Get an allocation rule by ID."""
    result = await db.execute(select(AllocationRule).where(AllocationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation rule not found")
    return AllocationRuleResponse.model_validate(rule)


@router.post("/rules", response_model=AllocationRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    body: AllocationRuleCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> AllocationRuleResponse:
    """Create an allocation rule with targets."""
    rule = AllocationRule(
        name=body.name,
        source_site_id=body.source_site_id,
        source_account_code=body.source_account_code,
        method=body.method,
        created_by=current_user.id,
    )
    db.add(rule)
    await db.flush()

    for t in body.targets:
        target = AllocationTarget(
            rule_id=rule.id,
            target_site_id=t.target_site_id,
            percentage=t.percentage,
        )
        db.add(target)

    await db.flush()
    await db.refresh(rule)

    await audit_log(
        "create",
        "allocation_rule",
        str(rule.id),
        details={"name": body.name, "method": body.method.value, "target_count": len(body.targets)},
    )

    return AllocationRuleResponse.model_validate(rule)


@router.put("/rules/{rule_id}", response_model=AllocationRuleResponse)
async def update_rule(
    rule_id: uuid.UUID,
    body: AllocationRuleUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> AllocationRuleResponse:
    """Update an allocation rule."""
    result = await db.execute(select(AllocationRule).where(AllocationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation rule not found")

    if body.name is not None:
        rule.name = body.name
    if body.is_active is not None:
        rule.is_active = body.is_active

    await db.flush()
    await db.refresh(rule)

    await audit_log("update", "allocation_rule", str(rule.id), details={"name": rule.name})

    return AllocationRuleResponse.model_validate(rule)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> None:
    """Delete an allocation rule."""
    result = await db.execute(select(AllocationRule).where(AllocationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation rule not found")

    await audit_log("delete", "allocation_rule", str(rule.id))
    await db.delete(rule)
    await db.flush()


@router.post("/rules/{rule_id}/execute", response_model=AllocationResultResponse)
async def execute_allocation(
    rule_id: uuid.UUID,
    body: AllocationExecute,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> AllocationResultResponse:
    """Execute an allocation rule for a given period and source amount."""
    result = await db.execute(select(AllocationRule).where(AllocationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation rule not found")

    if not rule.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Allocation rule is disabled")

    # Calculate allocations based on targets
    allocation_results: list[dict] = []
    for target in rule.targets:
        allocated = body.source_amount * target.percentage / Decimal("100")
        allocation_results.append({
            "site_id": str(target.target_site_id),
            "percentage": str(target.percentage),
            "allocated_amount": str(allocated),
        })

    alloc_result = AllocationResult(
        rule_id=rule.id,
        period_year=body.period_year,
        period_month=body.period_month,
        source_amount=body.source_amount,
        results=allocation_results,
    )
    db.add(alloc_result)
    await db.flush()
    await db.refresh(alloc_result)

    await audit_log(
        "execute",
        "allocation_rule",
        str(rule.id),
        details={
            "period": f"{body.period_year}-{body.period_month:02d}",
            "source_amount": str(body.source_amount),
        },
    )

    return AllocationResultResponse.model_validate(alloc_result)


@router.get("/rules/{rule_id}/results", response_model=AllocationResultListResponse)
async def list_results(
    rule_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> AllocationResultListResponse:
    """List allocation results for a rule."""
    result = await db.execute(
        select(AllocationResult)
        .where(AllocationResult.rule_id == rule_id)
        .order_by(AllocationResult.created_at.desc())
    )
    results = result.scalars().all()
    return AllocationResultListResponse(
        items=[AllocationResultResponse.model_validate(r) for r in results],
        total=len(results),
    )


__all__ = ["router"]
