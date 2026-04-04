from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuditLogger, CurrentUser, DbSession
from app.models.financial_data import FinancialLineItem, FinancialStatement
from app.models.scenario import AdjustmentType, Scenario, ScenarioAssumption
from app.schemas.scenario import (
    ProjectedFinancials,
    ProjectedLineItem,
    ScenarioComparison,
    ScenarioCreate,
    ScenarioListResponse,
    ScenarioResponse,
    ScenarioUpdate,
)

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=ScenarioListResponse)
async def list_scenarios(
    db: DbSession,
    current_user: CurrentUser,
) -> ScenarioListResponse:
    """List all active scenarios."""
    result = await db.execute(
        select(Scenario).where(Scenario.is_active == True).order_by(Scenario.name)
    )
    scenarios = result.scalars().all()
    return ScenarioListResponse(
        items=[ScenarioResponse.model_validate(s) for s in scenarios],
        total=len(scenarios),
    )


@router.get("/compare", response_model=ScenarioComparison)
async def compare_scenarios(
    db: DbSession,
    current_user: CurrentUser,
    scenario_ids: str = Query(..., description="Comma-separated scenario UUIDs"),
    site_id: uuid.UUID | None = Query(None),
    period_year: int | None = Query(None, ge=2000, le=2100),
    period_month: int | None = Query(None, ge=1, le=12),
) -> ScenarioComparison:
    """Compare multiple scenarios side by side."""
    ids = [uuid.UUID(s.strip()) for s in scenario_ids.split(",")]
    results: list[ProjectedFinancials] = []

    for sid in ids:
        result = await db.execute(select(Scenario).where(Scenario.id == sid))
        scenario = result.scalar_one_or_none()
        if scenario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {sid} not found",
            )
        projected = await _build_projected(db, scenario, site_id, period_year, period_month)
        results.append(projected)

    return ScenarioComparison(scenarios=results)


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> ScenarioResponse:
    """Get a scenario by ID."""
    result = await db.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return ScenarioResponse.model_validate(scenario)


@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    body: ScenarioCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ScenarioResponse:
    """Create a scenario with assumptions."""
    scenario = Scenario(
        name=body.name,
        description=body.description,
        base_year=body.base_year,
        created_by=current_user.id,
    )
    db.add(scenario)
    await db.flush()

    for a in body.assumptions:
        assumption = ScenarioAssumption(
            scenario_id=scenario.id,
            site_id=a.site_id,
            line_item_code=a.line_item_code,
            adjustment_type=a.adjustment_type,
            adjustment_value=a.adjustment_value,
            period_year=a.period_year,
            period_month=a.period_month,
        )
        db.add(assumption)

    await db.flush()
    await db.refresh(scenario)

    await audit_log(
        "create",
        "scenario",
        str(scenario.id),
        details={"name": body.name, "assumption_count": len(body.assumptions)},
    )

    return ScenarioResponse.model_validate(scenario)


@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: uuid.UUID,
    body: ScenarioUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ScenarioResponse:
    """Update a scenario."""
    result = await db.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    if body.name is not None:
        scenario.name = body.name
    if body.description is not None:
        scenario.description = body.description
    if body.is_active is not None:
        scenario.is_active = body.is_active

    await db.flush()
    await db.refresh(scenario)

    await audit_log("update", "scenario", str(scenario.id), details={"name": scenario.name})

    return ScenarioResponse.model_validate(scenario)


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario(
    scenario_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> None:
    """Delete a scenario."""
    result = await db.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    await audit_log("delete", "scenario", str(scenario.id))
    await db.delete(scenario)
    await db.flush()


async def _build_projected(
    db: AsyncSession,
    scenario: Scenario,
    site_id: uuid.UUID | None = None,
    period_year: int | None = None,
    period_month: int | None = None,
) -> ProjectedFinancials:
    """Apply scenario assumptions to actual financial data and return projected items."""
    year = period_year or scenario.base_year

    # Get actual line items for the base year
    stmt = (
        select(FinancialLineItem)
        .join(FinancialStatement, FinancialLineItem.statement_id == FinancialStatement.id)
        .where(FinancialStatement.period_year == year)
    )
    if site_id is not None:
        stmt = stmt.where(FinancialStatement.site_id == site_id)
    if period_month is not None:
        stmt = stmt.where(FinancialStatement.period_month == period_month)

    result = await db.execute(stmt)
    line_items = result.scalars().all()

    # Aggregate by line_item_code
    aggregated: dict[str, Decimal] = {}
    for li in line_items:
        aggregated[li.line_item_code] = aggregated.get(li.line_item_code, Decimal("0")) + li.amount

    # Build assumption lookup: (line_item_code, site_id) -> assumption
    assumption_map: dict[str, ScenarioAssumption] = {}
    for a in scenario.assumptions:
        if a.period_year == year and (period_month is None or a.period_month is None or a.period_month == period_month):
            assumption_map[a.line_item_code] = a

    projected_items: list[ProjectedLineItem] = []
    for code, original in aggregated.items():
        assumption = assumption_map.get(code)
        if assumption:
            if assumption.adjustment_type == AdjustmentType.percentage:
                adjusted = original * (1 + assumption.adjustment_value)
            elif assumption.adjustment_type == AdjustmentType.absolute:
                adjusted = original + assumption.adjustment_value
            else:  # override
                adjusted = assumption.adjustment_value
            projected_items.append(ProjectedLineItem(
                line_item_code=code,
                original_amount=original,
                adjusted_amount=adjusted,
                adjustment_type=assumption.adjustment_type,
                adjustment_value=assumption.adjustment_value,
            ))
        else:
            projected_items.append(ProjectedLineItem(
                line_item_code=code,
                original_amount=original,
                adjusted_amount=original,
            ))

    return ProjectedFinancials(
        scenario_id=scenario.id,
        scenario_name=scenario.name,
        items=projected_items,
    )


@router.get("/{scenario_id}/projected", response_model=ProjectedFinancials)
async def get_projected(
    scenario_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    site_id: uuid.UUID | None = Query(None),
    period_year: int | None = Query(None, ge=2000, le=2100),
    period_month: int | None = Query(None, ge=1, le=12),
) -> ProjectedFinancials:
    """Apply assumptions to actual data and return projected financials."""
    result = await db.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    return await _build_projected(db, scenario, site_id, period_year, period_month)


__all__ = ["router"]
