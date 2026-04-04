from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AuditLogger, CurrentUser, DbSession, require_site_access
from app.models.esg import ESGCategory, ESGMetric, ESGReport
from app.schemas.esg import (
    ESGMetricCreate,
    ESGMetricListResponse,
    ESGMetricResponse,
    ESGMetricUpdate,
    ESGReportCreate,
    ESGReportListResponse,
    ESGReportResponse,
    ESGReportUpdate,
)

router = APIRouter(prefix="/esg", tags=["esg"])


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------


@router.get("/metrics", response_model=ESGMetricListResponse)
async def list_metrics(
    db: DbSession,
    current_user: CurrentUser,
    site_id: uuid.UUID | None = Query(None),
    category: ESGCategory | None = Query(None),
    period_year: int | None = Query(None, ge=2000, le=2100),
) -> ESGMetricListResponse:
    """List ESG metrics with optional filters."""
    stmt = select(ESGMetric)
    if site_id is not None:
        stmt = stmt.where(ESGMetric.site_id == site_id)
    if category is not None:
        stmt = stmt.where(ESGMetric.category == category)
    if period_year is not None:
        stmt = stmt.where(ESGMetric.period_year == period_year)

    stmt = stmt.order_by(ESGMetric.period_year.desc(), ESGMetric.period_month.desc())
    result = await db.execute(stmt)
    metrics = result.scalars().all()

    return ESGMetricListResponse(
        items=[ESGMetricResponse.model_validate(m) for m in metrics],
        total=len(metrics),
    )


@router.post("/metrics", response_model=ESGMetricResponse, status_code=status.HTTP_201_CREATED)
async def create_metric(
    body: ESGMetricCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ESGMetricResponse:
    """Create an ESG metric."""
    await require_site_access(body.site_id, current_user)

    metric = ESGMetric(
        site_id=body.site_id,
        category=body.category,
        metric_name=body.metric_name,
        metric_value=body.metric_value,
        unit=body.unit,
        period_year=body.period_year,
        period_month=body.period_month,
        target_value=body.target_value,
        notes=body.notes,
    )
    db.add(metric)
    await db.flush()
    await db.refresh(metric)

    await audit_log(
        "create",
        "esg_metric",
        str(metric.id),
        site_id=body.site_id,
        details={"metric_name": body.metric_name, "category": body.category.value},
    )

    return ESGMetricResponse.model_validate(metric)


@router.put("/metrics/{metric_id}", response_model=ESGMetricResponse)
async def update_metric(
    metric_id: uuid.UUID,
    body: ESGMetricUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ESGMetricResponse:
    """Update an ESG metric."""
    result = await db.execute(select(ESGMetric).where(ESGMetric.id == metric_id))
    metric = result.scalar_one_or_none()
    if metric is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ESG metric not found")

    await require_site_access(metric.site_id, current_user)

    if body.metric_value is not None:
        metric.metric_value = body.metric_value
    if body.target_value is not None:
        metric.target_value = body.target_value
    if body.notes is not None:
        metric.notes = body.notes

    await db.flush()
    await db.refresh(metric)

    await audit_log("update", "esg_metric", str(metric.id), site_id=metric.site_id)

    return ESGMetricResponse.model_validate(metric)


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------


@router.get("/reports", response_model=ESGReportListResponse)
async def list_reports(
    db: DbSession,
    current_user: CurrentUser,
    report_year: int | None = Query(None, ge=2000, le=2100),
) -> ESGReportListResponse:
    """List ESG reports."""
    stmt = select(ESGReport)
    if report_year is not None:
        stmt = stmt.where(ESGReport.report_year == report_year)
    stmt = stmt.order_by(ESGReport.report_year.desc())

    result = await db.execute(stmt)
    reports = result.scalars().all()
    return ESGReportListResponse(
        items=[ESGReportResponse.model_validate(r) for r in reports],
        total=len(reports),
    )


@router.post("/reports", response_model=ESGReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    body: ESGReportCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ESGReportResponse:
    """Create an ESG report."""
    report = ESGReport(
        report_year=body.report_year,
        framework=body.framework,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)

    await audit_log(
        "create",
        "esg_report",
        str(report.id),
        details={"year": body.report_year, "framework": body.framework.value},
    )

    return ESGReportResponse.model_validate(report)


@router.put("/reports/{report_id}", response_model=ESGReportResponse)
async def update_report(
    report_id: uuid.UUID,
    body: ESGReportUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ESGReportResponse:
    """Update an ESG report status."""
    result = await db.execute(select(ESGReport).where(ESGReport.id == report_id))
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ESG report not found")

    if body.status is not None:
        report.status = body.status
    if body.published_date is not None:
        report.published_date = body.published_date

    await db.flush()
    await db.refresh(report)

    await audit_log("update", "esg_report", str(report.id), details={"status": report.status.value})

    return ESGReportResponse.model_validate(report)


__all__ = ["router"]
