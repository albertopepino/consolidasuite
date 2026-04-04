from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AuditLogger, CurrentUser, DbSession, require_site_access
from app.models.scenario import RollingForecast
from app.schemas.scenario import (
    RollingForecastCreate,
    RollingForecastListResponse,
    RollingForecastResponse,
    RollingForecastUpdate,
)

router = APIRouter(prefix="/forecasts", tags=["forecasts"])


@router.get("/{site_id}", response_model=RollingForecastListResponse)
async def list_forecasts(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    year: int | None = Query(None, ge=2000, le=2100),
) -> RollingForecastListResponse:
    """Get forecasts for a site, optionally filtered by year."""
    await require_site_access(site_id, current_user)

    stmt = select(RollingForecast).where(RollingForecast.site_id == site_id)
    if year is not None:
        stmt = stmt.where(RollingForecast.period_year == year)
    stmt = stmt.order_by(RollingForecast.period_year, RollingForecast.period_month)

    result = await db.execute(stmt)
    forecasts = result.scalars().all()
    return RollingForecastListResponse(
        items=[RollingForecastResponse.model_validate(f) for f in forecasts],
        total=len(forecasts),
    )


@router.post("", response_model=RollingForecastResponse, status_code=status.HTTP_201_CREATED)
async def create_forecast(
    body: RollingForecastCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> RollingForecastResponse:
    """Create a rolling forecast entry."""
    await require_site_access(body.site_id, current_user)

    forecast = RollingForecast(
        site_id=body.site_id,
        line_item_code=body.line_item_code,
        period_year=body.period_year,
        period_month=body.period_month,
        forecast_amount=body.forecast_amount,
        source=body.source,
        created_by=current_user.id,
    )
    db.add(forecast)
    await db.flush()
    await db.refresh(forecast)

    await audit_log(
        "create",
        "rolling_forecast",
        str(forecast.id),
        site_id=body.site_id,
        details={
            "line_item_code": body.line_item_code,
            "period": f"{body.period_year}-{body.period_month:02d}",
            "amount": str(body.forecast_amount),
        },
    )

    return RollingForecastResponse.model_validate(forecast)


@router.put("/{forecast_id}", response_model=RollingForecastResponse)
async def update_forecast(
    forecast_id: uuid.UUID,
    body: RollingForecastUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> RollingForecastResponse:
    """Update a rolling forecast entry."""
    result = await db.execute(select(RollingForecast).where(RollingForecast.id == forecast_id))
    forecast = result.scalar_one_or_none()
    if forecast is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forecast not found")

    await require_site_access(forecast.site_id, current_user)

    forecast.forecast_amount = body.forecast_amount
    if body.source is not None:
        forecast.source = body.source

    await db.flush()
    await db.refresh(forecast)

    await audit_log(
        "update",
        "rolling_forecast",
        str(forecast.id),
        site_id=forecast.site_id,
        details={"new_amount": str(body.forecast_amount)},
    )

    return RollingForecastResponse.model_validate(forecast)


@router.delete("/{forecast_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_forecast(
    forecast_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> None:
    """Delete a rolling forecast entry."""
    result = await db.execute(select(RollingForecast).where(RollingForecast.id == forecast_id))
    forecast = result.scalar_one_or_none()
    if forecast is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forecast not found")

    await require_site_access(forecast.site_id, current_user)
    await audit_log("delete", "rolling_forecast", str(forecast.id), site_id=forecast.site_id)
    await db.delete(forecast)
    await db.flush()


__all__ = ["router"]
