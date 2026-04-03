from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AuditLogger, CurrentUser, DbSession
from app.models.fx_rate import FxRate
from app.models.site import Site
from app.models.treasury import BankAccount, CashPosition, DebtInstrument, DebtStatus
from app.schemas.treasury import (
    AccountCashEntry,
    BankAccountCreate,
    BankAccountListResponse,
    BankAccountResponse,
    CashPositionCreate,
    CashPositionResponse,
    ConsolidatedCashResponse,
    DebtInstrumentCreate,
    DebtInstrumentListResponse,
    DebtInstrumentResponse,
    MaturityBucket,
    MaturityProfileResponse,
    SiteCashPosition,
)

router = APIRouter(prefix="/treasury", tags=["treasury"])

GROUP_CURRENCY = "EUR"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mask_account_number(num: str) -> str:
    if len(num) > 4:
        return "****" + num[-4:]
    return "****"


def _bank_account_to_response(ba: BankAccount) -> BankAccountResponse:
    """Convert a BankAccount ORM object to response with masked account number."""
    return BankAccountResponse(
        id=ba.id,
        site_id=ba.site_id,
        bank_name=ba.bank_name,
        account_number_masked=_mask_account_number(ba.account_number),
        iban=ba.iban,
        swift_bic=ba.swift_bic,
        currency=ba.currency,
        account_type=ba.account_type,
        is_primary=ba.is_primary,
        is_active=ba.is_active,
        created_at=ba.created_at,
        updated_at=ba.updated_at,
    )


# ---------------------------------------------------------------------------
# Bank Accounts
# ---------------------------------------------------------------------------


@router.get("/bank-accounts/{site_id}", response_model=BankAccountListResponse)
async def list_bank_accounts(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> BankAccountListResponse:
    """List bank accounts for a site (account numbers masked)."""
    result = await db.execute(
        select(BankAccount)
        .where(BankAccount.site_id == site_id)
        .order_by(BankAccount.bank_name)
    )
    accounts = result.scalars().all()
    return BankAccountListResponse(
        items=[_bank_account_to_response(a) for a in accounts],
        total=len(accounts),
    )


@router.post("/bank-accounts/{site_id}", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_account(
    site_id: uuid.UUID,
    body: BankAccountCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> BankAccountResponse:
    """Create a bank account for a site."""
    account = BankAccount(
        site_id=site_id,
        bank_name=body.bank_name,
        account_number=body.account_number,
        iban=body.iban,
        swift_bic=body.swift_bic,
        currency=body.currency,
        account_type=body.account_type,
        is_primary=body.is_primary,
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)

    await audit_log(
        "create",
        "bank_account",
        str(account.id),
        site_id=site_id,
        details={"bank_name": body.bank_name},
    )

    return _bank_account_to_response(account)


# ---------------------------------------------------------------------------
# Cash Positions
# ---------------------------------------------------------------------------


@router.get("/cash-position/consolidated", response_model=ConsolidatedCashResponse)
async def consolidated_cash_position(
    db: DbSession,
    current_user: CurrentUser,
    balance_date: date = Query(..., alias="date"),
) -> ConsolidatedCashResponse:
    """Consolidated cash position across all sites with FX conversion."""
    stmt = (
        select(CashPosition)
        .join(BankAccount, BankAccount.id == CashPosition.bank_account_id)
        .where(CashPosition.balance_date == balance_date)
    )
    result = await db.execute(stmt)
    positions = result.scalars().all()

    # Group by site
    site_map: dict[uuid.UUID, list[CashPosition]] = {}
    for p in positions:
        ba = p.bank_account
        sid = ba.site_id if ba else None
        if sid:
            site_map.setdefault(sid, []).append(p)

    # Fetch sites
    site_ids = list(site_map.keys())
    sites_result = await db.execute(select(Site).where(Site.id.in_(site_ids)))
    sites = {s.id: s for s in sites_result.scalars().all()}

    # Fetch FX rates for the month
    fx_stmt = select(FxRate).where(
        FxRate.to_currency == GROUP_CURRENCY,
        FxRate.period_year == balance_date.year,
        FxRate.period_month == balance_date.month,
    )
    fx_result = await db.execute(fx_stmt)
    fx_rates = {r.from_currency: r.closing_rate for r in fx_result.scalars().all()}

    by_site: list[SiteCashPosition] = []
    total_group = Decimal("0")

    for sid, pos_list in site_map.items():
        site = sites.get(sid)
        if not site:
            continue
        accounts: list[AccountCashEntry] = []
        total_local = Decimal("0")
        for p in pos_list:
            ba = p.bank_account
            accounts.append(AccountCashEntry(
                bank_account_id=p.bank_account_id,
                bank_name=ba.bank_name if ba else "Unknown",
                balance=p.balance,
                currency=p.currency,
            ))
            total_local += p.balance
            # Convert to group currency
            if p.currency == GROUP_CURRENCY:
                total_group += p.balance
            elif p.currency in fx_rates:
                total_group += p.balance * fx_rates[p.currency]
            else:
                # Fallback: assume 1:1 if no rate found
                total_group += p.balance

        by_site.append(SiteCashPosition(
            site_id=sid,
            site_name=site.name,
            accounts=accounts,
            total_local=total_local,
            local_currency=site.local_currency,
        ))

    return ConsolidatedCashResponse(
        date=balance_date,
        group_currency=GROUP_CURRENCY,
        total_group=total_group,
        by_site=by_site,
    )


@router.get("/cash-position/{site_id}", response_model=SiteCashPosition)
async def cash_position_by_site(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    balance_date: date = Query(..., alias="date"),
) -> SiteCashPosition:
    """Cash position per site for a given date."""
    site_result = await db.execute(select(Site).where(Site.id == site_id))
    site = site_result.scalar_one_or_none()
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    stmt = (
        select(CashPosition)
        .join(BankAccount, BankAccount.id == CashPosition.bank_account_id)
        .where(BankAccount.site_id == site_id)
        .where(CashPosition.balance_date == balance_date)
    )
    result = await db.execute(stmt)
    positions = result.scalars().all()

    accounts: list[AccountCashEntry] = []
    total = Decimal("0")
    for p in positions:
        ba = p.bank_account
        accounts.append(AccountCashEntry(
            bank_account_id=p.bank_account_id,
            bank_name=ba.bank_name if ba else "Unknown",
            balance=p.balance,
            currency=p.currency,
        ))
        total += p.balance

    return SiteCashPosition(
        site_id=site_id,
        site_name=site.name,
        accounts=accounts,
        total_local=total,
        local_currency=site.local_currency,
    )


@router.post("/cash-position", response_model=CashPositionResponse, status_code=status.HTTP_201_CREATED)
async def record_cash_position(
    body: CashPositionCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> CashPositionResponse:
    """Record a cash position entry."""
    # Verify bank account exists
    ba_result = await db.execute(select(BankAccount).where(BankAccount.id == body.bank_account_id))
    ba = ba_result.scalar_one_or_none()
    if ba is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    position = CashPosition(
        bank_account_id=body.bank_account_id,
        balance_date=body.balance_date,
        balance=body.balance,
        currency=body.currency,
    )
    db.add(position)
    await db.flush()
    await db.refresh(position)

    await audit_log(
        "create",
        "cash_position",
        str(position.id),
        site_id=ba.site_id,
        details={"balance": str(body.balance), "date": str(body.balance_date)},
    )

    return CashPositionResponse.model_validate(position)


# ---------------------------------------------------------------------------
# Debt Instruments
# ---------------------------------------------------------------------------


@router.get("/debt/maturity-profile", response_model=MaturityProfileResponse)
async def debt_maturity_profile(
    db: DbSession,
    current_user: CurrentUser,
) -> MaturityProfileResponse:
    """Consolidated debt maturity profile across all sites."""
    result = await db.execute(
        select(DebtInstrument).where(DebtInstrument.status == DebtStatus.active)
    )
    instruments = result.scalars().all()

    # Fetch FX rates for current month for conversion
    today = date.today()
    fx_stmt = select(FxRate).where(
        FxRate.to_currency == GROUP_CURRENCY,
        FxRate.period_year == today.year,
        FxRate.period_month == today.month,
    )
    fx_result = await db.execute(fx_stmt)
    fx_rates = {r.from_currency: r.closing_rate for r in fx_result.scalars().all()}

    buckets: dict[str, tuple[Decimal, int]] = {
        "0-1y": (Decimal("0"), 0),
        "1-3y": (Decimal("0"), 0),
        "3-5y": (Decimal("0"), 0),
        "5y+": (Decimal("0"), 0),
    }

    total_debt = Decimal("0")
    for inst in instruments:
        days_to_maturity = (inst.maturity_date - today).days
        years = days_to_maturity / 365.0

        if years <= 1:
            bucket_key = "0-1y"
        elif years <= 3:
            bucket_key = "1-3y"
        elif years <= 5:
            bucket_key = "3-5y"
        else:
            bucket_key = "5y+"

        # Convert to group currency
        amount = inst.outstanding_amount
        if inst.currency != GROUP_CURRENCY and inst.currency in fx_rates:
            amount = amount * fx_rates[inst.currency]

        old_total, old_count = buckets[bucket_key]
        buckets[bucket_key] = (old_total + amount, old_count + 1)
        total_debt += amount

    return MaturityProfileResponse(
        group_currency=GROUP_CURRENCY,
        buckets=[
            MaturityBucket(bucket=k, total_outstanding=v[0], instrument_count=v[1])
            for k, v in buckets.items()
        ],
        total_debt=total_debt,
    )


@router.get("/debt/{site_id}", response_model=DebtInstrumentListResponse)
async def list_debt_instruments(
    site_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> DebtInstrumentListResponse:
    """List debt instruments for a site."""
    result = await db.execute(
        select(DebtInstrument)
        .where(DebtInstrument.site_id == site_id)
        .order_by(DebtInstrument.maturity_date)
    )
    items = result.scalars().all()
    return DebtInstrumentListResponse(
        items=[DebtInstrumentResponse.model_validate(i) for i in items],
        total=len(items),
    )


@router.post("/debt/{site_id}", response_model=DebtInstrumentResponse, status_code=status.HTTP_201_CREATED)
async def create_debt_instrument(
    site_id: uuid.UUID,
    body: DebtInstrumentCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> DebtInstrumentResponse:
    """Create a debt instrument for a site."""
    instrument = DebtInstrument(
        site_id=site_id,
        instrument_type=body.instrument_type,
        lender=body.lender,
        currency=body.currency,
        principal_amount=body.principal_amount,
        outstanding_amount=body.outstanding_amount,
        interest_rate=body.interest_rate,
        start_date=body.start_date,
        maturity_date=body.maturity_date,
        repayment_schedule=body.repayment_schedule,
        status=body.status,
    )
    db.add(instrument)
    await db.flush()
    await db.refresh(instrument)

    await audit_log(
        "create",
        "debt_instrument",
        str(instrument.id),
        site_id=site_id,
        details={"lender": body.lender, "type": body.instrument_type.value},
    )

    return DebtInstrumentResponse.model_validate(instrument)


__all__ = ["router"]
