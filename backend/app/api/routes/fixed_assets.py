from __future__ import annotations

import csv
import io
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select

from app.api.deps import AuditLogger, CurrentUser, DbSession, require_site_access
from app.models.fixed_assets import Asset, AssetCategory, AssetStatus, DepreciationMethod
from app.models.fx_rate import FxRate
from app.models.site import Site
from app.schemas.fixed_assets import (
    AssetCategorySummary,
    AssetCreate,
    AssetListResponse,
    AssetResponse,
    AssetUpdate,
    AssetSummaryResponse,
    AssetUploadResponse,
    ConsolidatedAssetSummaryResponse,
    DepreciationScheduleEntry,
    DepreciationScheduleResponse,
)

router = APIRouter(prefix="/assets", tags=["fixed-assets"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _compute_nbv(acquisition_cost: Decimal, accumulated_depreciation: Decimal) -> Decimal:
    return acquisition_cost - accumulated_depreciation


def _build_depreciation_schedule(
    acquisition_cost: Decimal,
    residual_value: Decimal,
    useful_life_months: int,
    depreciation_method: DepreciationMethod,
    acquisition_date: date,
) -> list[DepreciationScheduleEntry]:
    """Generate a monthly depreciation schedule."""
    depreciable_amount = acquisition_cost - residual_value
    if depreciable_amount <= 0 or useful_life_months <= 0:
        return []

    entries: list[DepreciationScheduleEntry] = []
    accumulated = Decimal("0")
    opening_nbv = acquisition_cost

    for month_offset in range(1, useful_life_months + 1):
        period_date = acquisition_date + relativedelta(months=month_offset)
        period_str = period_date.strftime("%Y-%m")

        if depreciation_method == DepreciationMethod.straight_line:
            monthly_dep = round(depreciable_amount / useful_life_months, 2)
            # Adjust last month for rounding
            if month_offset == useful_life_months:
                monthly_dep = depreciable_amount - accumulated
        elif depreciation_method == DepreciationMethod.declining_balance:
            # Double declining balance
            annual_rate = Decimal("2") / Decimal(str(useful_life_months)) * Decimal("12")
            monthly_rate = annual_rate / Decimal("12")
            monthly_dep = round(opening_nbv * monthly_rate, 2)
            # Don't depreciate below residual value
            if opening_nbv - monthly_dep < residual_value:
                monthly_dep = opening_nbv - residual_value
            if monthly_dep < 0:
                monthly_dep = Decimal("0")
        else:
            # Units of production: fall back to straight line for schedule
            monthly_dep = round(depreciable_amount / useful_life_months, 2)
            if month_offset == useful_life_months:
                monthly_dep = depreciable_amount - accumulated

        accumulated += monthly_dep
        closing_nbv = acquisition_cost - accumulated

        entries.append(
            DepreciationScheduleEntry(
                month=month_offset,
                period=period_str,
                opening_nbv=opening_nbv,
                depreciation=monthly_dep,
                accumulated_depreciation=accumulated,
                closing_nbv=closing_nbv,
            )
        )
        opening_nbv = closing_nbv

    return entries


# ---------------------------------------------------------------------------
# Asset CRUD
# ---------------------------------------------------------------------------


@router.get("/{site_id}", response_model=AssetListResponse)
async def list_assets(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    category: AssetCategory | None = Query(None),
    status_filter: AssetStatus | None = Query(None, alias="status"),
) -> AssetListResponse:
    """List assets for a site, with optional filters."""
    await require_site_access(site_id, current_user)

    stmt = select(Asset).where(Asset.site_id == site_id)
    if category is not None:
        stmt = stmt.where(Asset.category == category)
    if status_filter is not None:
        stmt = stmt.where(Asset.status == status_filter)
    stmt = stmt.order_by(Asset.asset_code)

    result = await db.execute(stmt)
    assets = result.scalars().all()

    return AssetListResponse(
        items=[AssetResponse.model_validate(a) for a in assets],
        total=len(assets),
    )


@router.post("/{site_id}", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    site_id: uuid.UUID,
    body: AssetCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> AssetResponse:
    """Create a new fixed asset."""
    await require_site_access(site_id, current_user)

    nbv = _compute_nbv(body.acquisition_cost, Decimal("0"))

    asset = Asset(
        site_id=site_id,
        asset_code=body.asset_code,
        name=body.name,
        category=body.category,
        acquisition_date=body.acquisition_date,
        acquisition_cost=body.acquisition_cost,
        currency=body.currency,
        useful_life_months=body.useful_life_months,
        depreciation_method=body.depreciation_method,
        residual_value=body.residual_value,
        accumulated_depreciation=Decimal("0"),
        net_book_value=nbv,
        status=AssetStatus.active,
        location=body.location,
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(asset)
    await db.flush()
    await db.refresh(asset)

    await audit_log(
        "create",
        "asset",
        str(asset.id),
        site_id=site_id,
        details={
            "asset_code": body.asset_code,
            "name": body.name,
            "cost": str(body.acquisition_cost),
            "currency": body.currency,
        },
    )

    return AssetResponse.model_validate(asset)


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: uuid.UUID,
    body: AssetUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> AssetResponse:
    """Update a fixed asset."""
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    await require_site_access(asset.site_id, current_user)

    update_data = body.model_dump(exclude_unset=True)
    old_values = {}
    for field, value in update_data.items():
        old_values[field] = str(getattr(asset, field))
        setattr(asset, field, value)

    # Recompute NBV
    asset.net_book_value = _compute_nbv(asset.acquisition_cost, asset.accumulated_depreciation)

    await db.flush()
    await db.refresh(asset)

    await audit_log(
        "update",
        "asset",
        str(asset.id),
        site_id=asset.site_id,
        details={"old_values": old_values, "new_values": {k: str(v) for k, v in update_data.items()}},
    )

    return AssetResponse.model_validate(asset)


# ---------------------------------------------------------------------------
# Asset summary
# ---------------------------------------------------------------------------


@router.get("/{site_id}/summary", response_model=AssetSummaryResponse)
async def asset_summary(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> AssetSummaryResponse:
    """Asset summary for a site, grouped by category."""
    await require_site_access(site_id, current_user)

    stmt = (
        select(
            Asset.category,
            func.count(Asset.id).label("count"),
            func.coalesce(func.sum(Asset.acquisition_cost), 0).label("total_cost"),
            func.coalesce(func.sum(Asset.net_book_value), 0).label("total_nbv"),
        )
        .where(Asset.site_id == site_id)
        .group_by(Asset.category)
    )

    result = await db.execute(stmt)
    rows = result.all()

    by_category = [
        AssetCategorySummary(
            category=row.category,
            count=row.count,
            total_cost=row.total_cost,
            total_nbv=row.total_nbv,
        )
        for row in rows
    ]

    total_assets = sum(c.count for c in by_category)
    total_cost = sum(c.total_cost for c in by_category)
    total_nbv = sum(c.total_nbv for c in by_category)

    return AssetSummaryResponse(
        site_id=site_id,
        total_assets=total_assets,
        total_cost=total_cost,
        total_nbv=total_nbv,
        by_category=by_category,
    )


@router.get("/consolidated/summary", response_model=ConsolidatedAssetSummaryResponse)
async def consolidated_asset_summary(
    db: DbSession,
    current_user: CurrentUser,
    reporting_currency: str = Query("EUR", max_length=3, min_length=3),
    year: int = Query(2025, ge=2000, le=2100),
    month: int = Query(12, ge=1, le=12),
) -> ConsolidatedAssetSummaryResponse:
    """Consolidated asset summary across all sites with FX conversion."""
    # Get all active sites
    sites_result = await db.execute(select(Site).where(Site.is_active == True))
    sites = sites_result.scalars().all()

    # Prefetch FX rates for the period
    fx_stmt = select(FxRate).where(
        FxRate.to_currency == reporting_currency,
        FxRate.period_year == year,
        FxRate.period_month == month,
    )
    fx_result = await db.execute(fx_stmt)
    fx_rates = {rate.from_currency: rate.closing_rate for rate in fx_result.scalars().all()}

    # Get asset summaries per category across all sites
    stmt = (
        select(
            Asset.category,
            Asset.currency,
            func.count(Asset.id).label("count"),
            func.coalesce(func.sum(Asset.acquisition_cost), 0).label("total_cost"),
            func.coalesce(func.sum(Asset.net_book_value), 0).label("total_nbv"),
        )
        .group_by(Asset.category, Asset.currency)
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Aggregate with FX conversion
    from collections import defaultdict

    cat_agg: dict[AssetCategory, dict] = defaultdict(lambda: {"count": 0, "total_cost": Decimal("0"), "total_nbv": Decimal("0")})

    for row in rows:
        currency = row.currency
        if currency == reporting_currency:
            rate = Decimal("1")
        else:
            rate = fx_rates.get(currency, Decimal("1"))

        cat_agg[row.category]["count"] += row.count
        cat_agg[row.category]["total_cost"] += round(row.total_cost * rate, 2)
        cat_agg[row.category]["total_nbv"] += round(row.total_nbv * rate, 2)

    by_category = [
        AssetCategorySummary(
            category=cat,
            count=data["count"],
            total_cost=data["total_cost"],
            total_nbv=data["total_nbv"],
        )
        for cat, data in cat_agg.items()
    ]

    total_assets = sum(c.count for c in by_category)
    total_cost = sum(c.total_cost for c in by_category)
    total_nbv = sum(c.total_nbv for c in by_category)

    return ConsolidatedAssetSummaryResponse(
        reporting_currency=reporting_currency,
        total_assets=total_assets,
        total_cost=total_cost,
        total_nbv=total_nbv,
        by_category=by_category,
    )


# ---------------------------------------------------------------------------
# CSV upload
# ---------------------------------------------------------------------------


@router.post("/{site_id}/upload", response_model=AssetUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_assets_csv(
    site_id: uuid.UUID,
    file: UploadFile,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> AssetUploadResponse:
    """Bulk upload assets from a CSV file.

    Expected columns: asset_code, name, category, acquisition_date (YYYY-MM-DD),
    acquisition_cost, currency, useful_life_months, depreciation_method,
    residual_value, location, notes
    """
    await require_site_access(site_id, current_user)

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    created = 0
    errors: list[str] = []

    for row_num, row in enumerate(reader, start=2):
        try:
            asset_code = row["asset_code"].strip()
            name = row["name"].strip()
            category = AssetCategory(row["category"].strip())
            acquisition_date_val = date.fromisoformat(row["acquisition_date"].strip())
            acquisition_cost = Decimal(row["acquisition_cost"].strip())
            currency = row["currency"].strip()
            useful_life_months = int(row["useful_life_months"].strip())
            depreciation_method = DepreciationMethod(row.get("depreciation_method", "straight_line").strip())
            residual_value = Decimal(row.get("residual_value", "0").strip() or "0")
            location = row.get("location", "").strip() or None
            notes = row.get("notes", "").strip() or None

            nbv = _compute_nbv(acquisition_cost, Decimal("0"))

            asset = Asset(
                site_id=site_id,
                asset_code=asset_code,
                name=name,
                category=category,
                acquisition_date=acquisition_date_val,
                acquisition_cost=acquisition_cost,
                currency=currency,
                useful_life_months=useful_life_months,
                depreciation_method=depreciation_method,
                residual_value=residual_value,
                accumulated_depreciation=Decimal("0"),
                net_book_value=nbv,
                status=AssetStatus.active,
                location=location,
                notes=notes,
                created_by=current_user.id,
            )
            db.add(asset)
            created += 1
        except (KeyError, ValueError, InvalidOperation) as exc:
            errors.append(f"Row {row_num}: {exc}")

    if created > 0:
        await db.flush()

    await audit_log(
        "upload",
        "asset",
        f"site:{site_id}",
        site_id=site_id,
        details={"created": created, "errors_count": len(errors), "filename": file.filename},
    )

    return AssetUploadResponse(created=created, errors=errors)


# ---------------------------------------------------------------------------
# Depreciation schedule
# ---------------------------------------------------------------------------


@router.get("/{asset_id}/depreciation-schedule", response_model=DepreciationScheduleResponse)
async def get_depreciation_schedule(
    asset_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> DepreciationScheduleResponse:
    """Generate the monthly depreciation schedule for an asset."""
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    await require_site_access(asset.site_id, current_user)

    schedule = _build_depreciation_schedule(
        acquisition_cost=asset.acquisition_cost,
        residual_value=asset.residual_value,
        useful_life_months=asset.useful_life_months,
        depreciation_method=asset.depreciation_method,
        acquisition_date=asset.acquisition_date,
    )

    return DepreciationScheduleResponse(
        asset_id=asset.id,
        asset_code=asset.asset_code,
        name=asset.name,
        acquisition_cost=asset.acquisition_cost,
        residual_value=asset.residual_value,
        useful_life_months=asset.useful_life_months,
        depreciation_method=asset.depreciation_method,
        schedule=schedule,
    )


__all__ = ["router"]
