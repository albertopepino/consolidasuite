from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps import AuditLogger, CurrentUser, DbSession
from app.models.site import Site
from app.models.tax import FilingStatus, TaxFiling, TaxJurisdiction
from app.schemas.tax import (
    EffectiveTaxRateResponse,
    EffectiveTaxRateSite,
    FilingOverviewResponse,
    FilingOverviewSite,
    TaxFilingCreate,
    TaxFilingListResponse,
    TaxFilingResponse,
    TaxFilingUpdate,
    TaxJurisdictionCreate,
    TaxJurisdictionListResponse,
    TaxJurisdictionResponse,
)

router = APIRouter(prefix="/tax", tags=["tax"])


# ---------------------------------------------------------------------------
# Tax Jurisdictions
# ---------------------------------------------------------------------------


@router.get("/jurisdictions", response_model=TaxJurisdictionListResponse)
async def list_jurisdictions(
    db: DbSession,
    current_user: CurrentUser,
) -> TaxJurisdictionListResponse:
    """List all tax jurisdictions."""
    result = await db.execute(
        select(TaxJurisdiction).order_by(TaxJurisdiction.effective_from.desc())
    )
    items = result.scalars().all()
    return TaxJurisdictionListResponse(
        items=[TaxJurisdictionResponse.model_validate(j) for j in items],
        total=len(items),
    )


@router.post("/jurisdictions", response_model=TaxJurisdictionResponse, status_code=status.HTTP_201_CREATED)
async def create_jurisdiction(
    body: TaxJurisdictionCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> TaxJurisdictionResponse:
    """Create or update a tax jurisdiction for a site."""
    jurisdiction = TaxJurisdiction(
        site_id=body.site_id,
        corporate_tax_rate=body.corporate_tax_rate,
        vat_rate=body.vat_rate,
        withholding_tax_rate=body.withholding_tax_rate,
        social_security_employer_rate=body.social_security_employer_rate,
        social_security_employee_rate=body.social_security_employee_rate,
        fiscal_year_start_month=body.fiscal_year_start_month,
        notes=body.notes,
        effective_from=body.effective_from,
    )
    db.add(jurisdiction)
    await db.flush()
    await db.refresh(jurisdiction)

    await audit_log(
        "create",
        "tax_jurisdiction",
        str(jurisdiction.id),
        site_id=body.site_id,
        details={"corporate_tax_rate": str(body.corporate_tax_rate)},
    )

    return TaxJurisdictionResponse.model_validate(jurisdiction)


# ---------------------------------------------------------------------------
# Tax Filings
# ---------------------------------------------------------------------------


@router.get("/filings/overview", response_model=FilingOverviewResponse)
async def filings_overview(
    db: DbSession,
    current_user: CurrentUser,
) -> FilingOverviewResponse:
    """Consolidated view: all filings grouped by site and status."""
    stmt = (
        select(
            TaxFiling.site_id,
            Site.name.label("site_name"),
            TaxFiling.status,
            func.count().label("cnt"),
        )
        .join(Site, Site.id == TaxFiling.site_id)
        .group_by(TaxFiling.site_id, Site.name, TaxFiling.status)
    )
    result = await db.execute(stmt)
    rows = result.all()

    site_map: dict[uuid.UUID, FilingOverviewSite] = {}
    for row in rows:
        if row.site_id not in site_map:
            site_map[row.site_id] = FilingOverviewSite(
                site_id=row.site_id, site_name=row.site_name
            )
        entry = site_map[row.site_id]
        setattr(entry, row.status.value, row.cnt)
        entry.total += row.cnt

    return FilingOverviewResponse(items=list(site_map.values()))


@router.get("/effective-rates", response_model=EffectiveTaxRateResponse)
async def effective_rates(
    db: DbSession,
    current_user: CurrentUser,
    year: int | None = Query(None, ge=2000, le=2100),
) -> EffectiveTaxRateResponse:
    """Effective tax rate per site (total corporate_tax filed / total amount)."""
    stmt = (
        select(
            TaxFiling.site_id,
            Site.name.label("site_name"),
            TaxFiling.currency,
            func.sum(TaxFiling.amount).label("total_tax"),
        )
        .join(Site, Site.id == TaxFiling.site_id)
        .where(TaxFiling.filing_type == "corporate_tax")
        .where(TaxFiling.status.in_(["filed", "accepted"]))
    )
    if year is not None:
        stmt = stmt.where(TaxFiling.period_year == year)
    stmt = stmt.group_by(TaxFiling.site_id, Site.name, TaxFiling.currency)

    result = await db.execute(stmt)
    rows = result.all()

    items = [
        EffectiveTaxRateSite(
            site_id=row.site_id,
            site_name=row.site_name,
            total_tax_paid=row.total_tax or Decimal("0"),
            currency=row.currency,
            effective_rate=None,
        )
        for row in rows
    ]
    return EffectiveTaxRateResponse(items=items)


@router.get("/filings", response_model=TaxFilingListResponse)
async def list_filings(
    db: DbSession,
    current_user: CurrentUser,
    site_id: uuid.UUID | None = Query(None),
    year: int | None = Query(None, ge=2000, le=2100),
    filing_status: FilingStatus | None = Query(None, alias="status"),
) -> TaxFilingListResponse:
    """List tax filings with optional filters."""
    stmt = select(TaxFiling)
    if site_id is not None:
        stmt = stmt.where(TaxFiling.site_id == site_id)
    if year is not None:
        stmt = stmt.where(TaxFiling.period_year == year)
    if filing_status is not None:
        stmt = stmt.where(TaxFiling.status == filing_status)
    stmt = stmt.order_by(TaxFiling.due_date.desc())

    result = await db.execute(stmt)
    items = result.scalars().all()
    return TaxFilingListResponse(
        items=[TaxFilingResponse.model_validate(f) for f in items],
        total=len(items),
    )


@router.post("/filings", response_model=TaxFilingResponse, status_code=status.HTTP_201_CREATED)
async def create_filing(
    body: TaxFilingCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> TaxFilingResponse:
    """Create a new tax filing."""
    filing = TaxFiling(
        site_id=body.site_id,
        filing_type=body.filing_type,
        period_year=body.period_year,
        period_quarter=body.period_quarter,
        due_date=body.due_date,
        filed_date=body.filed_date,
        status=body.status,
        amount=body.amount,
        currency=body.currency,
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(filing)
    await db.flush()
    await db.refresh(filing)

    await audit_log(
        "create",
        "tax_filing",
        str(filing.id),
        site_id=body.site_id,
        details={"filing_type": body.filing_type.value, "year": body.period_year},
    )

    return TaxFilingResponse.model_validate(filing)


@router.put("/filings/{filing_id}", response_model=TaxFilingResponse)
async def update_filing(
    filing_id: uuid.UUID,
    body: TaxFilingUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> TaxFilingResponse:
    """Update a tax filing status/dates."""
    result = await db.execute(select(TaxFiling).where(TaxFiling.id == filing_id))
    filing = result.scalar_one_or_none()
    if filing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tax filing not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(filing, field, value)

    await db.flush()
    await db.refresh(filing)

    await audit_log(
        "update",
        "tax_filing",
        str(filing.id),
        site_id=filing.site_id,
        details=update_data,
    )

    return TaxFilingResponse.model_validate(filing)


__all__ = ["router"]
