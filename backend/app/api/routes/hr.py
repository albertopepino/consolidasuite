from __future__ import annotations

import csv
import io
import uuid
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import AuditLogger, CurrentUser, DbSession, require_site_access
from app.models.fx_rate import FxRate
from app.models.hr import Department, Employee, EmploymentType, Position, SalaryRecord
from app.models.site import Site
from app.schemas.hr import (
    ConsolidatedPayrollSite,
    ConsolidatedPayrollSummary,
    DepartmentCreate,
    DepartmentHeadcount,
    DepartmentPayrollSummary,
    DepartmentResponse,
    DepartmentUpdate,
    EmployeeCreate,
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeUpdate,
    EmploymentTypeHeadcount,
    HeadcountSummary,
    PositionCreate,
    PositionResponse,
    PositionUpdate,
    SalaryCsvRow,
    SalaryListResponse,
    SalaryRecordCreate,
    SalaryRecordResponse,
    SalarySummary,
)

router = APIRouter(prefix="/hr", tags=["hr"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _employee_to_response(emp: Employee) -> EmployeeResponse:
    """Build an EmployeeResponse with joined position_title and department_name."""
    return EmployeeResponse(
        id=emp.id,
        site_id=emp.site_id,
        employee_code=emp.employee_code,
        first_name=emp.first_name,
        last_name=emp.last_name,
        email=emp.email,
        position_id=emp.position_id,
        department_id=emp.department_id,
        position_title=emp.position.title if emp.position else None,
        department_name=emp.department.name if emp.department else None,
        employment_type=emp.employment_type,
        fte_ratio=emp.fte_ratio,
        start_date=emp.start_date,
        end_date=emp.end_date,
        is_active=emp.is_active,
        created_at=emp.created_at,
        updated_at=emp.updated_at,
    )


# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------


@router.get("/departments/{site_id}", response_model=list[DepartmentResponse])
async def list_departments(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> list[DepartmentResponse]:
    """List departments for a site."""
    await require_site_access(site_id, current_user)

    stmt = (
        select(Department)
        .where(Department.site_id == site_id)
        .order_by(Department.name)
    )
    result = await db.execute(stmt)
    departments = result.scalars().all()
    return [DepartmentResponse.model_validate(d) for d in departments]


@router.post("/departments/{site_id}", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    site_id: uuid.UUID,
    body: DepartmentCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> DepartmentResponse:
    """Create a department for a site."""
    await require_site_access(site_id, current_user)

    dept = Department(
        site_id=site_id,
        name=body.name,
        code=body.code,
        head_employee_id=body.head_employee_id,
    )
    db.add(dept)
    await db.flush()
    await db.refresh(dept)

    await audit_log(
        "create", "department", str(dept.id), site_id=site_id,
        details={"name": body.name, "code": body.code},
    )

    return DepartmentResponse.model_validate(dept)


# ---------------------------------------------------------------------------
# Positions
# ---------------------------------------------------------------------------


@router.get("/positions/{site_id}", response_model=list[PositionResponse])
async def list_positions(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> list[PositionResponse]:
    """List positions for a site."""
    await require_site_access(site_id, current_user)

    stmt = (
        select(Position)
        .where(Position.site_id == site_id)
        .order_by(Position.title)
    )
    result = await db.execute(stmt)
    positions = result.scalars().all()
    return [PositionResponse.model_validate(p) for p in positions]


@router.post("/positions/{site_id}", response_model=PositionResponse, status_code=status.HTTP_201_CREATED)
async def create_position(
    site_id: uuid.UUID,
    body: PositionCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> PositionResponse:
    """Create a position for a site."""
    await require_site_access(site_id, current_user)

    pos = Position(
        site_id=site_id,
        title=body.title,
        department_id=body.department_id,
        level=body.level,
    )
    db.add(pos)
    await db.flush()
    await db.refresh(pos)

    await audit_log(
        "create", "position", str(pos.id), site_id=site_id,
        details={"title": body.title, "level": body.level},
    )

    return PositionResponse.model_validate(pos)


# ---------------------------------------------------------------------------
# Employees
# ---------------------------------------------------------------------------


@router.get("/employees/{site_id}", response_model=EmployeeListResponse)
async def list_employees(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    department_id: uuid.UUID | None = Query(None),
    active_only: bool = Query(True),
) -> EmployeeListResponse:
    """List employees for a site with optional filters."""
    await require_site_access(site_id, current_user)

    stmt = (
        select(Employee)
        .options(selectinload(Employee.position), selectinload(Employee.department))
        .where(Employee.site_id == site_id)
    )
    if department_id is not None:
        stmt = stmt.where(Employee.department_id == department_id)
    if active_only:
        stmt = stmt.where(Employee.is_active == True)  # noqa: E712
    stmt = stmt.order_by(Employee.last_name, Employee.first_name)

    result = await db.execute(stmt)
    employees = result.scalars().all()

    items = [_employee_to_response(e) for e in employees]
    return EmployeeListResponse(items=items, total=len(items))


@router.post("/employees/{site_id}", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    site_id: uuid.UUID,
    body: EmployeeCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> EmployeeResponse:
    """Create an employee for a site."""
    await require_site_access(site_id, current_user)

    emp = Employee(
        site_id=site_id,
        employee_code=body.employee_code,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        position_id=body.position_id,
        department_id=body.department_id,
        employment_type=body.employment_type,
        fte_ratio=body.fte_ratio,
        start_date=body.start_date,
        end_date=body.end_date,
    )
    db.add(emp)
    await db.flush()
    await db.refresh(emp, attribute_names=["position", "department"])

    await audit_log(
        "create", "employee", str(emp.id), site_id=site_id,
        details={"employee_code": body.employee_code, "name": f"{body.first_name} {body.last_name}"},
    )

    return _employee_to_response(emp)


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: uuid.UUID,
    body: EmployeeUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> EmployeeResponse:
    """Update an employee."""
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.position), selectinload(Employee.department))
        .where(Employee.id == employee_id)
    )
    emp = result.scalar_one_or_none()
    if emp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    await require_site_access(emp.site_id, current_user)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(emp, field, value)

    await db.flush()
    await db.refresh(emp, attribute_names=["position", "department"])

    await audit_log(
        "update", "employee", str(emp.id), site_id=emp.site_id,
        details={"updated_fields": list(update_data.keys())},
    )

    return _employee_to_response(emp)


# ---------------------------------------------------------------------------
# Salary Records
# ---------------------------------------------------------------------------


@router.get("/salaries/{site_id}", response_model=SalaryListResponse)
async def list_salaries(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
) -> SalaryListResponse:
    """List salary records for a site and period."""
    await require_site_access(site_id, current_user)

    stmt = (
        select(SalaryRecord)
        .join(Employee, SalaryRecord.employee_id == Employee.id)
        .where(
            Employee.site_id == site_id,
            SalaryRecord.period_year == year,
            SalaryRecord.period_month == month,
        )
        .order_by(SalaryRecord.created_at)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    return SalaryListResponse(
        items=[SalaryRecordResponse.model_validate(r) for r in records],
        total=len(records),
    )


@router.post("/salaries/upload/{site_id}", status_code=status.HTTP_201_CREATED)
async def upload_salaries_csv(
    site_id: uuid.UUID,
    file: UploadFile,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> dict:
    """Bulk upload salary records from a CSV file.

    Expected CSV columns: employee_code, period_year, period_month,
    gross_salary, net_salary, employer_taxes, employee_taxes, benefits, bonus
    """
    await require_site_access(site_id, current_user)

    # Get site for currency
    site_result = await db.execute(select(Site).where(Site.id == site_id))
    site = site_result.scalar_one_or_none()
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    # Read CSV
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows: list[SalaryCsvRow] = []
    errors: list[str] = []

    for i, row in enumerate(reader, start=2):  # row 1 is header
        try:
            rows.append(SalaryCsvRow(**{k.strip(): v.strip() for k, v in row.items()}))
        except Exception as exc:
            errors.append(f"Row {i}: {exc}")

    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "CSV validation failed", "errors": errors[:50]},
        )

    # Resolve employee codes to IDs
    codes = {r.employee_code for r in rows}
    emp_result = await db.execute(
        select(Employee).where(Employee.site_id == site_id, Employee.employee_code.in_(codes))
    )
    employees_by_code: dict[str, Employee] = {e.employee_code: e for e in emp_result.scalars().all()}

    missing = codes - set(employees_by_code.keys())
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Unknown employee codes", "codes": sorted(missing)},
        )

    created = 0
    for row in rows:
        emp = employees_by_code[row.employee_code]
        total_cost = row.gross_salary + row.employer_taxes + row.benefits
        record = SalaryRecord(
            employee_id=emp.id,
            period_year=row.period_year,
            period_month=row.period_month,
            currency=site.local_currency,
            gross_salary=row.gross_salary,
            net_salary=row.net_salary,
            employer_taxes=row.employer_taxes,
            employee_taxes=row.employee_taxes,
            benefits=row.benefits,
            total_cost=total_cost,
            bonus=row.bonus,
        )
        db.add(record)
        created += 1

    await db.flush()

    await audit_log(
        "upload", "salary_records", str(site_id), site_id=site_id,
        details={"records_created": created, "filename": file.filename},
    )

    return {"created": created, "site_id": str(site_id)}


# ---------------------------------------------------------------------------
# Headcount
# ---------------------------------------------------------------------------


async def _build_headcount(db: DbSession, site_id: uuid.UUID | None, site_name: str | None) -> HeadcountSummary:
    """Build headcount summary for one site or all sites."""
    emp_query = select(Employee).where(Employee.is_active == True)  # noqa: E712
    if site_id is not None:
        emp_query = emp_query.where(Employee.site_id == site_id)

    emp_query = emp_query.options(selectinload(Employee.department))
    result = await db.execute(emp_query)
    employees = result.scalars().all()

    total_headcount = len(employees)
    fte_count = sum(e.fte_ratio for e in employees)

    # By department
    dept_map: dict[uuid.UUID, dict] = {}
    for e in employees:
        did = e.department_id
        if did not in dept_map:
            dept_map[did] = {
                "department_id": did,
                "department_name": e.department.name if e.department else "Unknown",
                "headcount": 0,
                "fte_count": Decimal("0"),
            }
        dept_map[did]["headcount"] += 1
        dept_map[did]["fte_count"] += e.fte_ratio

    # By employment type
    type_map: dict[EmploymentType, dict] = {}
    for e in employees:
        et = e.employment_type
        if et not in type_map:
            type_map[et] = {"employment_type": et, "headcount": 0, "fte_count": Decimal("0")}
        type_map[et]["headcount"] += 1
        type_map[et]["fte_count"] += e.fte_ratio

    return HeadcountSummary(
        site_id=site_id,
        site_name=site_name,
        total_headcount=total_headcount,
        fte_count=fte_count,
        by_department=[DepartmentHeadcount(**v) for v in dept_map.values()],
        by_employment_type=[EmploymentTypeHeadcount(**v) for v in type_map.values()],
    )


@router.get("/headcount/{site_id}", response_model=HeadcountSummary)
async def get_headcount(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> HeadcountSummary:
    """Headcount summary for a single site."""
    await require_site_access(site_id, current_user)

    site_result = await db.execute(select(Site).where(Site.id == site_id))
    site = site_result.scalar_one_or_none()
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    return await _build_headcount(db, site_id, site.name)


@router.get("/headcount/consolidated", response_model=HeadcountSummary)
async def get_consolidated_headcount(
    db: DbSession,
    current_user: CurrentUser,
) -> HeadcountSummary:
    """Consolidated headcount across all sites."""
    return await _build_headcount(db, None, "All Sites")


# ---------------------------------------------------------------------------
# Payroll Summary
# ---------------------------------------------------------------------------


async def _build_payroll_summary(
    db: DbSession, site_id: uuid.UUID, year: int, month: int
) -> SalarySummary:
    """Build payroll summary for a site/period grouped by department."""
    site_result = await db.execute(select(Site).where(Site.id == site_id))
    site = site_result.scalar_one_or_none()
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    stmt = (
        select(SalaryRecord)
        .join(Employee, SalaryRecord.employee_id == Employee.id)
        .options(selectinload(SalaryRecord.employee).selectinload(Employee.department))
        .where(
            Employee.site_id == site_id,
            SalaryRecord.period_year == year,
            SalaryRecord.period_month == month,
        )
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    # Aggregate totals
    total_gross = Decimal("0")
    total_net = Decimal("0")
    total_employer_taxes = Decimal("0")
    total_employee_taxes = Decimal("0")
    total_benefits = Decimal("0")
    total_cost = Decimal("0")
    total_bonus = Decimal("0")

    dept_agg: dict[uuid.UUID, dict] = {}

    for r in records:
        total_gross += r.gross_salary
        total_net += r.net_salary
        total_employer_taxes += r.employer_taxes
        total_employee_taxes += r.employee_taxes
        total_benefits += r.benefits
        total_cost += r.total_cost
        total_bonus += r.bonus

        did = r.employee.department_id
        dept_name = r.employee.department.name if r.employee.department else "Unknown"
        if did not in dept_agg:
            dept_agg[did] = {
                "department_id": did,
                "department_name": dept_name,
                "employee_count": 0,
                "total_gross": Decimal("0"),
                "total_net": Decimal("0"),
                "total_employer_taxes": Decimal("0"),
                "total_employee_taxes": Decimal("0"),
                "total_benefits": Decimal("0"),
                "total_cost": Decimal("0"),
                "total_bonus": Decimal("0"),
                "currency": r.currency,
            }
        d = dept_agg[did]
        d["employee_count"] += 1
        d["total_gross"] += r.gross_salary
        d["total_net"] += r.net_salary
        d["total_employer_taxes"] += r.employer_taxes
        d["total_employee_taxes"] += r.employee_taxes
        d["total_benefits"] += r.benefits
        d["total_cost"] += r.total_cost
        d["total_bonus"] += r.bonus

    return SalarySummary(
        site_id=site_id,
        site_name=site.name,
        period_year=year,
        period_month=month,
        currency=site.local_currency,
        employee_count=len(records),
        total_gross=total_gross,
        total_net=total_net,
        total_employer_taxes=total_employer_taxes,
        total_employee_taxes=total_employee_taxes,
        total_benefits=total_benefits,
        total_cost=total_cost,
        total_bonus=total_bonus,
        by_department=[DepartmentPayrollSummary(**v) for v in dept_agg.values()],
    )


@router.get("/payroll/{site_id}", response_model=SalarySummary)
async def get_payroll_summary(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
) -> SalarySummary:
    """Payroll summary for a site/period (totals by department)."""
    await require_site_access(site_id, current_user)
    return await _build_payroll_summary(db, site_id, year, month)


@router.get("/payroll/consolidated", response_model=ConsolidatedPayrollSummary)
async def get_consolidated_payroll(
    db: DbSession,
    current_user: CurrentUser,
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
) -> ConsolidatedPayrollSummary:
    """Consolidated payroll across all sites with FX conversion to EUR."""
    # Get all active sites
    sites_result = await db.execute(select(Site).where(Site.is_active == True))  # noqa: E712
    sites = sites_result.scalars().all()

    # Get FX rates for the period (to EUR)
    fx_result = await db.execute(
        select(FxRate).where(
            FxRate.to_currency == "EUR",
            FxRate.period_year == year,
            FxRate.period_month == month,
        )
    )
    fx_rates: dict[str, Decimal] = {r.from_currency: r.average_rate for r in fx_result.scalars().all()}
    # EUR -> EUR rate is 1
    fx_rates["EUR"] = Decimal("1")

    consolidated_sites: list[ConsolidatedPayrollSite] = []
    grand_total_cost = Decimal("0")
    grand_total_employees = 0

    for site in sites:
        # Get total cost for this site
        stmt = (
            select(
                func.count(SalaryRecord.id).label("emp_count"),
                func.coalesce(func.sum(SalaryRecord.total_cost), 0).label("total_cost"),
            )
            .join(Employee, SalaryRecord.employee_id == Employee.id)
            .where(
                Employee.site_id == site.id,
                SalaryRecord.period_year == year,
                SalaryRecord.period_month == month,
            )
        )
        result = await db.execute(stmt)
        row = result.one()
        emp_count = row.emp_count
        total_cost_local = Decimal(str(row.total_cost))

        if emp_count == 0:
            continue

        rate = fx_rates.get(site.local_currency, Decimal("0"))
        total_cost_eur = total_cost_local * rate if rate else Decimal("0")

        consolidated_sites.append(
            ConsolidatedPayrollSite(
                site_id=site.id,
                site_name=site.name,
                local_currency=site.local_currency,
                fx_rate=rate,
                total_cost_local=total_cost_local,
                total_cost_eur=total_cost_eur,
                employee_count=emp_count,
            )
        )
        grand_total_cost += total_cost_eur
        grand_total_employees += emp_count

    return ConsolidatedPayrollSummary(
        period_year=year,
        period_month=month,
        target_currency="EUR",
        sites=consolidated_sites,
        grand_total_cost_eur=grand_total_cost,
        grand_total_employees=grand_total_employees,
    )


__all__ = ["router"]
