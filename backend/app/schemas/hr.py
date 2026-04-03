from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.hr import EmploymentType


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------


class DepartmentCreate(BaseModel):
    name: str = Field(max_length=255)
    code: str = Field(max_length=20)
    head_employee_id: uuid.UUID | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    code: str | None = Field(None, max_length=20)
    head_employee_id: uuid.UUID | None = None
    is_active: bool | None = None


class DepartmentResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    name: str
    code: str
    head_employee_id: uuid.UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Position
# ---------------------------------------------------------------------------


class PositionCreate(BaseModel):
    title: str = Field(max_length=255)
    department_id: uuid.UUID
    level: str = Field(max_length=50)


class PositionUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    department_id: uuid.UUID | None = None
    level: str | None = Field(None, max_length=50)
    is_active: bool | None = None


class PositionResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    title: str
    department_id: uuid.UUID
    level: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Employee
# ---------------------------------------------------------------------------


class EmployeeCreate(BaseModel):
    employee_code: str = Field(max_length=50)
    first_name: str = Field(max_length=255)
    last_name: str = Field(max_length=255)
    email: str | None = Field(None, max_length=255)
    position_id: uuid.UUID
    department_id: uuid.UUID
    employment_type: EmploymentType
    fte_ratio: Decimal = Field(default=Decimal("1.00"), ge=0, le=Decimal("1.00"))
    start_date: date
    end_date: date | None = None


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=255)
    last_name: str | None = Field(None, max_length=255)
    email: str | None = Field(None, max_length=255)
    position_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None
    employment_type: EmploymentType | None = None
    fte_ratio: Decimal | None = Field(None, ge=0, le=Decimal("1.00"))
    end_date: date | None = None
    is_active: bool | None = None


class EmployeeResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    employee_code: str
    first_name: str
    last_name: str
    email: str | None
    position_id: uuid.UUID
    department_id: uuid.UUID
    position_title: str | None = None
    department_name: str | None = None
    employment_type: EmploymentType
    fte_ratio: Decimal
    start_date: date
    end_date: date | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmployeeListResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int


# ---------------------------------------------------------------------------
# Salary Record
# ---------------------------------------------------------------------------


class SalaryRecordCreate(BaseModel):
    employee_id: uuid.UUID
    period_year: int = Field(ge=2000, le=2100)
    period_month: int = Field(ge=1, le=12)
    currency: str = Field(max_length=3)
    gross_salary: Decimal
    net_salary: Decimal
    employer_taxes: Decimal
    employee_taxes: Decimal
    benefits: Decimal
    total_cost: Decimal
    overtime_hours: Decimal = Decimal("0.00")
    bonus: Decimal = Decimal("0.00")
    notes: str | None = None


class SalaryRecordResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    period_year: int
    period_month: int
    currency: str
    gross_salary: Decimal
    net_salary: Decimal
    employer_taxes: Decimal
    employee_taxes: Decimal
    benefits: Decimal
    total_cost: Decimal
    overtime_hours: Decimal
    bonus: Decimal
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SalaryListResponse(BaseModel):
    items: list[SalaryRecordResponse]
    total: int


# ---------------------------------------------------------------------------
# Salary CSV upload row
# ---------------------------------------------------------------------------


class SalaryCsvRow(BaseModel):
    employee_code: str
    period_year: int = Field(ge=2000, le=2100)
    period_month: int = Field(ge=1, le=12)
    gross_salary: Decimal
    net_salary: Decimal
    employer_taxes: Decimal
    employee_taxes: Decimal
    benefits: Decimal
    bonus: Decimal = Decimal("0.00")


# ---------------------------------------------------------------------------
# Aggregated summaries
# ---------------------------------------------------------------------------


class DepartmentPayrollSummary(BaseModel):
    department_id: uuid.UUID
    department_name: str
    employee_count: int
    total_gross: Decimal
    total_net: Decimal
    total_employer_taxes: Decimal
    total_employee_taxes: Decimal
    total_benefits: Decimal
    total_cost: Decimal
    total_bonus: Decimal
    currency: str


class SalarySummary(BaseModel):
    site_id: uuid.UUID
    site_name: str
    period_year: int
    period_month: int
    currency: str
    employee_count: int
    total_gross: Decimal
    total_net: Decimal
    total_employer_taxes: Decimal
    total_employee_taxes: Decimal
    total_benefits: Decimal
    total_cost: Decimal
    total_bonus: Decimal
    by_department: list[DepartmentPayrollSummary]


class ConsolidatedPayrollSite(BaseModel):
    site_id: uuid.UUID
    site_name: str
    local_currency: str
    fx_rate: Decimal
    total_cost_local: Decimal
    total_cost_eur: Decimal
    employee_count: int


class ConsolidatedPayrollSummary(BaseModel):
    period_year: int
    period_month: int
    target_currency: str  # EUR
    sites: list[ConsolidatedPayrollSite]
    grand_total_cost_eur: Decimal
    grand_total_employees: int


class DepartmentHeadcount(BaseModel):
    department_id: uuid.UUID
    department_name: str
    headcount: int
    fte_count: Decimal


class EmploymentTypeHeadcount(BaseModel):
    employment_type: EmploymentType
    headcount: int
    fte_count: Decimal


class HeadcountSummary(BaseModel):
    site_id: uuid.UUID | None = None
    site_name: str | None = None
    total_headcount: int
    fte_count: Decimal
    by_department: list[DepartmentHeadcount]
    by_employment_type: list[EmploymentTypeHeadcount]


__all__ = [
    "ConsolidatedPayrollSummary",
    "DepartmentCreate",
    "DepartmentPayrollSummary",
    "DepartmentResponse",
    "DepartmentUpdate",
    "EmployeeCreate",
    "EmployeeListResponse",
    "EmployeeResponse",
    "EmployeeUpdate",
    "HeadcountSummary",
    "PositionCreate",
    "PositionResponse",
    "PositionUpdate",
    "SalaryCsvRow",
    "SalaryListResponse",
    "SalaryRecordCreate",
    "SalaryRecordResponse",
    "SalarySummary",
]
