from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, Query
from sqlalchemy import select

from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession, require_site_access
from app.models.budget import BudgetEntry
from app.models.site import Site
from app.models.user import UserRole
from app.services.ai_forecast import generate_forecast
from app.services.consolidation import consolidate_financial_data, get_site_financial_data
from app.services.kpi import calculate_all_kpis

router = APIRouter(prefix="/analytics", tags=["analytics"])

ZERO = Decimal("0")


def _safe_pct(num: Decimal, denom: Decimal) -> float | None:
    """Return percentage as float, or None if denom is zero."""
    if denom == ZERO:
        return None
    return float((num / denom).quantize(Decimal("0.0001")))


# ---------------------------------------------------------------------------
# Variance Analysis: Actual vs Budget
# ---------------------------------------------------------------------------


@router.get("/variance/{site_id}")
async def get_variance(
    site_id: uuid.UUID,
    period_year: int,
    period_month: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[dict]:
    """Compare actual vs budget for a specific site and period.

    Returns a list of {line_item, actual, budget, variance_amount, variance_pct}.
    """
    await require_site_access(site_id, current_user)

    # Get actual data
    data = await get_site_financial_data(db, site_id, period_year, period_month)
    actuals: dict[str, Decimal] = {}
    for items_map in data.values():
        actuals.update(items_map)

    # Get budget data
    stmt = select(BudgetEntry).where(
        BudgetEntry.site_id == site_id,
        BudgetEntry.period_year == period_year,
        BudgetEntry.period_month == period_month,
    )
    result = await db.execute(stmt)
    budget_entries = result.scalars().all()
    budgets: dict[str, Decimal] = {b.line_item_code: b.budget_amount for b in budget_entries}

    # Combine all line items
    all_codes = sorted(set(actuals.keys()) | set(budgets.keys()))

    variance_rows: list[dict] = []
    for code in all_codes:
        actual = actuals.get(code, ZERO)
        budget = budgets.get(code, ZERO)
        variance_amount = actual - budget
        variance_pct = _safe_pct(variance_amount, budget) if budget != ZERO else None

        variance_rows.append({
            "line_item": code,
            "actual": str(actual),
            "budget": str(budget),
            "variance_amount": str(variance_amount),
            "variance_pct": variance_pct,
        })

    return variance_rows


@router.get("/variance/consolidated")
async def get_consolidated_variance(
    period_year: int,
    period_month: int,
    db: DbSession,
    current_user: CurrentUser,
    target_currency: str = Query("EUR", min_length=3, max_length=3),
) -> list[dict]:
    """Consolidated variance: actual vs budget across all accessible sites."""
    if current_user.role == UserRole.local_cfo:
        site_ids = [s.id for s in current_user.assigned_sites]
    else:
        result = await db.execute(select(Site.id).where(Site.is_active == True))  # noqa: E712
        site_ids = list(result.scalars().all())

    if not site_ids:
        return []

    # Consolidated actuals
    data = await consolidate_financial_data(
        db, site_ids, period_year, period_month, target_currency
    )
    actuals: dict[str, Decimal] = {}
    for items_map in data.values():
        actuals.update(items_map)

    # Consolidated budgets (sum of all site budgets)
    stmt = select(BudgetEntry).where(
        BudgetEntry.site_id.in_(site_ids),
        BudgetEntry.period_year == period_year,
        BudgetEntry.period_month == period_month,
    )
    result = await db.execute(stmt)
    budget_entries = result.scalars().all()
    budgets: dict[str, Decimal] = {}
    for b in budget_entries:
        budgets[b.line_item_code] = budgets.get(b.line_item_code, ZERO) + b.budget_amount

    all_codes = sorted(set(actuals.keys()) | set(budgets.keys()))

    variance_rows: list[dict] = []
    for code in all_codes:
        actual = actuals.get(code, ZERO)
        budget = budgets.get(code, ZERO)
        variance_amount = actual - budget
        variance_pct = _safe_pct(variance_amount, budget) if budget != ZERO else None

        variance_rows.append({
            "line_item": code,
            "actual": str(actual),
            "budget": str(budget),
            "variance_amount": str(variance_amount),
            "variance_pct": variance_pct,
        })

    return variance_rows


# ---------------------------------------------------------------------------
# Period Comparison
# ---------------------------------------------------------------------------


@router.get("/period-comparison/{site_id}")
async def get_period_comparison(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    year1: int = Query(..., ge=2000, le=2100),
    month1: int = Query(..., ge=1, le=12),
    year2: int = Query(..., ge=2000, le=2100),
    month2: int = Query(..., ge=1, le=12),
) -> list[dict]:
    """Compare two periods for a site (e.g. Dec 2025 vs Nov 2025).

    Returns [{line_item, period1_amount, period2_amount, change_amount, change_pct}].
    """
    await require_site_access(site_id, current_user)

    data1 = await get_site_financial_data(db, site_id, year1, month1)
    data2 = await get_site_financial_data(db, site_id, year2, month2)

    period1: dict[str, Decimal] = {}
    for items_map in data1.values():
        period1.update(items_map)

    period2: dict[str, Decimal] = {}
    for items_map in data2.values():
        period2.update(items_map)

    all_codes = sorted(set(period1.keys()) | set(period2.keys()))

    comparison_rows: list[dict] = []
    for code in all_codes:
        amt1 = period1.get(code, ZERO)
        amt2 = period2.get(code, ZERO)
        change = amt1 - amt2
        change_pct = _safe_pct(change, amt2) if amt2 != ZERO else None

        comparison_rows.append({
            "line_item": code,
            "period1_amount": str(amt1),
            "period2_amount": str(amt2),
            "change_amount": str(change),
            "change_pct": change_pct,
        })

    return comparison_rows


# ---------------------------------------------------------------------------
# Multi-Month Trend
# ---------------------------------------------------------------------------


@router.get("/trend/{site_id}")
async def get_trend(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    start_year: int = Query(..., ge=2000, le=2100),
    start_month: int = Query(..., ge=1, le=12),
    months: int = Query(6, ge=1, le=24),
) -> list[dict]:
    """Multi-month trend for key KPIs for a site.

    Returns [{month, revenue, gross_margin, ebitda, net_income, current_ratio, ...}].
    """
    await require_site_access(site_id, current_user)

    trend_data: list[dict] = []

    year = start_year
    month = start_month

    for _ in range(months):
        data = await get_site_financial_data(db, site_id, year, month)
        merged: dict[str, Decimal] = {}
        for items_map in data.values():
            merged.update(items_map)

        kpis = calculate_all_kpis(merged)

        # Extract key KPIs
        def _find_kpi(kpi_list, name: str) -> float | None:
            for kpi in kpi_list:
                if kpi.name == name:
                    return float(kpi.value) if kpi.value is not None else None
            return None

        row = {
            "month": f"{year}-{month:02d}",
            "revenue": _find_kpi(kpis["profitability"], "Revenue"),
            "gross_margin": _find_kpi(kpis["profitability"], "Gross Margin"),
            "ebitda": _find_kpi(kpis["profitability"], "EBITDA"),
            "ebitda_margin": _find_kpi(kpis["profitability"], "EBITDA Margin"),
            "net_income": _find_kpi(kpis["profitability"], "Net Income"),
            "net_profit_margin": _find_kpi(kpis["profitability"], "Net Profit Margin"),
            "current_ratio": _find_kpi(kpis["liquidity"], "Current Ratio"),
            "working_capital": _find_kpi(kpis["liquidity"], "Working Capital"),
            "cash_bank": _find_kpi(kpis["liquidity"], "Cash & Bank"),
            "debt_equity": _find_kpi(kpis["leverage"], "Debt-to-Equity"),
        }
        trend_data.append(row)

        # Advance to next month
        month += 1
        if month > 12:
            month = 1
            year += 1

    return trend_data


# ---------------------------------------------------------------------------
# AI Forecast
# ---------------------------------------------------------------------------


class ForecastPointResponse(BaseModel):
    period_year: int
    period_month: int
    predicted_value: Decimal
    lower_bound: Decimal
    upper_bound: Decimal
    method: str


class AIForecastResponse(BaseModel):
    site_id: uuid.UUID
    kpi: str
    historical_points: list[dict]
    forecast_points: list[ForecastPointResponse]


@router.get("/ai-forecast/{site_id}", response_model=AIForecastResponse)
async def ai_forecast(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    kpi: str = Query(..., description="Line item code to forecast, e.g. 'revenue'"),
    periods: int = Query(6, ge=1, le=24, description="Number of periods to forecast"),
) -> AIForecastResponse:
    """Generate an AI-based forecast for a KPI at a site.

    Uses linear regression with seasonal adjustment on historical data.
    Returns predicted values with confidence intervals.
    """
    await require_site_access(site_id, current_user)

    result = await generate_forecast(db, site_id, kpi, periods)

    return AIForecastResponse(
        site_id=result.site_id,
        kpi=result.kpi,
        historical_points=result.historical_points,
        forecast_points=[
            ForecastPointResponse(
                period_year=fp.period_year,
                period_month=fp.period_month,
                predicted_value=fp.predicted_value,
                lower_bound=fp.lower_bound,
                upper_bound=fp.upper_bound,
                method=fp.method,
            )
            for fp in result.forecast_points
        ],
    )


__all__ = ["router"]
