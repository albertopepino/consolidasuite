"""Simple trend-based forecasting service.

Provides linear regression, moving average, and seasonal adjustment
without external AI dependencies.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.financial_data import FinancialLineItem, FinancialStatement


@dataclass
class ForecastPoint:
    period_year: int
    period_month: int
    predicted_value: Decimal
    lower_bound: Decimal
    upper_bound: Decimal
    method: str


@dataclass
class ForecastResult:
    site_id: uuid.UUID
    kpi: str
    historical_points: list[dict]
    forecast_points: list[ForecastPoint]


def _linear_regression(xs: list[float], ys: list[float]) -> tuple[float, float]:
    """Simple OLS: y = a + b*x. Returns (intercept, slope)."""
    n = len(xs)
    if n < 2:
        return (ys[0] if ys else 0.0, 0.0)

    x_mean = sum(xs) / n
    y_mean = sum(ys) / n

    ss_xy = sum((xs[i] - x_mean) * (ys[i] - y_mean) for i in range(n))
    ss_xx = sum((xs[i] - x_mean) ** 2 for i in range(n))

    if ss_xx == 0:
        return (y_mean, 0.0)

    b = ss_xy / ss_xx
    a = y_mean - b * x_mean
    return (a, b)


def _moving_average(values: list[float], window: int = 3) -> float:
    """Calculate moving average of the last `window` values."""
    if not values:
        return 0.0
    w = min(window, len(values))
    return sum(values[-w:]) / w


def _std_dev(values: list[float]) -> float:
    """Calculate population standard deviation."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return variance ** 0.5


def _seasonal_adjustment(
    historical: list[tuple[int, int, float]],
    target_month: int,
) -> float | None:
    """Return the average value for the same month across years, or None if no data."""
    same_month = [v for (_, m, v) in historical if m == target_month]
    if not same_month:
        return None
    return sum(same_month) / len(same_month)


async def generate_forecast(
    db: AsyncSession,
    site_id: uuid.UUID,
    kpi: str,
    periods: int = 6,
) -> ForecastResult:
    """Generate a simple forecast for a given KPI (line_item_code) at a site.

    Combines linear regression with seasonal adjustment and produces
    confidence intervals based on historical variance.
    """
    # Fetch historical data points
    stmt = (
        select(
            FinancialStatement.period_year,
            FinancialStatement.period_month,
            FinancialLineItem.amount,
        )
        .join(FinancialStatement, FinancialLineItem.statement_id == FinancialStatement.id)
        .where(
            FinancialStatement.site_id == site_id,
            FinancialLineItem.line_item_code == kpi,
        )
        .order_by(FinancialStatement.period_year, FinancialStatement.period_month)
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Build historical time series
    historical: list[tuple[int, int, float]] = []
    historical_points: list[dict] = []
    for year, month, amount in rows:
        val = float(amount)
        historical.append((year, month, val))
        historical_points.append({
            "period_year": year,
            "period_month": month,
            "value": str(amount),
        })

    if not historical:
        # No data: return zero forecasts
        return ForecastResult(
            site_id=site_id,
            kpi=kpi,
            historical_points=[],
            forecast_points=[
                ForecastPoint(
                    period_year=2026,
                    period_month=i,
                    predicted_value=Decimal("0"),
                    lower_bound=Decimal("0"),
                    upper_bound=Decimal("0"),
                    method="no_data",
                )
                for i in range(1, periods + 1)
            ],
        )

    # Prepare data for regression (x = sequential index)
    xs = list(range(len(historical)))
    ys = [v for (_, _, v) in historical]
    intercept, slope = _linear_regression([float(x) for x in xs], ys)
    std = _std_dev(ys)

    # Determine starting period for forecast
    last_year, last_month, _ = historical[-1]
    forecast_points: list[ForecastPoint] = []

    for i in range(1, periods + 1):
        # Next period
        m = last_month + i
        y = last_year + (m - 1) // 12
        m = ((m - 1) % 12) + 1

        # Linear regression prediction
        x_val = float(len(historical) - 1 + i)
        lr_pred = intercept + slope * x_val

        # Seasonal adjustment
        seasonal = _seasonal_adjustment(historical, m)

        # Blend: 70% regression + 30% seasonal (if available)
        if seasonal is not None:
            predicted = lr_pred * 0.7 + seasonal * 0.3
        else:
            predicted = lr_pred

        # Confidence interval: +/- 1.5 * std_dev, widening with distance
        margin = std * 1.5 * (1 + i * 0.1)
        lower = predicted - margin
        upper = predicted + margin

        forecast_points.append(ForecastPoint(
            period_year=y,
            period_month=m,
            predicted_value=Decimal(str(round(predicted, 2))),
            lower_bound=Decimal(str(round(lower, 2))),
            upper_bound=Decimal(str(round(upper, 2))),
            method="linear_regression_seasonal",
        ))

    return ForecastResult(
        site_id=site_id,
        kpi=kpi,
        historical_points=historical_points,
        forecast_points=forecast_points,
    )


__all__ = ["ForecastPoint", "ForecastResult", "generate_forecast"]
