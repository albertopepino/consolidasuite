from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import and_, extract, func, select

from app.api.deps import AuditLogger, CurrentUser, DbSession, require_site_access
from app.models.intercompany import ICInvoice, ICInvoiceStatus, ICLoan, ICLoanStatus
from app.schemas.intercompany import (
    ICInvoiceCreate,
    ICInvoiceListResponse,
    ICInvoiceResponse,
    ICInvoiceUpdate,
    ICLoanCreate,
    ICLoanListResponse,
    ICLoanResponse,
    ICLoanSitePairSummary,
    ICLoanSummaryResponse,
    ICReconciliationEntry,
    ICReconciliationReport,
)

router = APIRouter(prefix="/intercompany", tags=["intercompany"])


# ---------------------------------------------------------------------------
# IC Invoices
# ---------------------------------------------------------------------------


@router.get("/invoices", response_model=ICInvoiceListResponse)
async def list_ic_invoices(
    db: DbSession,
    current_user: CurrentUser,
    site_id: uuid.UUID | None = Query(None),
    status_filter: ICInvoiceStatus | None = Query(None, alias="status"),
) -> ICInvoiceListResponse:
    """List intercompany invoices, optionally filtered by site or status."""
    stmt = select(ICInvoice)

    if site_id is not None:
        await require_site_access(site_id, current_user)
        stmt = stmt.where(
            (ICInvoice.sender_site_id == site_id) | (ICInvoice.receiver_site_id == site_id)
        )

    if status_filter is not None:
        stmt = stmt.where(ICInvoice.status == status_filter)

    stmt = stmt.order_by(ICInvoice.invoice_date.desc())

    result = await db.execute(stmt)
    invoices = result.scalars().all()

    return ICInvoiceListResponse(
        items=[ICInvoiceResponse.model_validate(inv) for inv in invoices],
        total=len(invoices),
    )


@router.post("/invoices", response_model=ICInvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_ic_invoice(
    body: ICInvoiceCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ICInvoiceResponse:
    """Create a new intercompany invoice."""
    await require_site_access(body.sender_site_id, current_user)

    if body.sender_site_id == body.receiver_site_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Sender and receiver sites must be different",
        )

    invoice = ICInvoice(
        invoice_number=body.invoice_number,
        sender_site_id=body.sender_site_id,
        receiver_site_id=body.receiver_site_id,
        invoice_date=body.invoice_date,
        due_date=body.due_date,
        currency=body.currency,
        amount=body.amount,
        description=body.description,
        category=body.category,
        status=body.status,
        created_by=current_user.id,
    )
    db.add(invoice)
    await db.flush()
    await db.refresh(invoice)

    await audit_log(
        "create",
        "ic_invoice",
        str(invoice.id),
        site_id=body.sender_site_id,
        details={
            "invoice_number": body.invoice_number,
            "sender_site_id": str(body.sender_site_id),
            "receiver_site_id": str(body.receiver_site_id),
            "amount": str(body.amount),
            "currency": body.currency,
        },
    )

    return ICInvoiceResponse.model_validate(invoice)


@router.put("/invoices/{invoice_id}", response_model=ICInvoiceResponse)
async def update_ic_invoice(
    invoice_id: uuid.UUID,
    body: ICInvoiceUpdate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ICInvoiceResponse:
    """Update an intercompany invoice (status, matching, etc.)."""
    result = await db.execute(select(ICInvoice).where(ICInvoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IC invoice not found")

    await require_site_access(invoice.sender_site_id, current_user)

    update_data = body.model_dump(exclude_unset=True)
    old_values = {}
    for field, value in update_data.items():
        old_values[field] = str(getattr(invoice, field))
        setattr(invoice, field, value)

    await db.flush()
    await db.refresh(invoice)

    await audit_log(
        "update",
        "ic_invoice",
        str(invoice.id),
        site_id=invoice.sender_site_id,
        details={"old_values": old_values, "new_values": {k: str(v) for k, v in update_data.items()}},
    )

    return ICInvoiceResponse.model_validate(invoice)


@router.get("/reconciliation", response_model=ICReconciliationReport)
async def reconcile_ic_invoices(
    db: DbSession,
    current_user: CurrentUser,
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
) -> ICReconciliationReport:
    """Auto-reconcile IC invoices for a given period.

    Finds matching pairs by sender<->receiver, amount, and period.
    Reports matched, unmatched, and mismatched invoices.
    """
    # Get all invoices for the period
    stmt = select(ICInvoice).where(
        extract("year", ICInvoice.invoice_date) == year,
        extract("month", ICInvoice.invoice_date) == month,
    )
    result = await db.execute(stmt)
    invoices = list(result.scalars().all())

    # Separate sent vs received invoices
    # "sent" = invoices created by senders; "received" = invoices created by receivers
    # We match sender->receiver with receiver->sender for same amount & currency
    entries: list[ICReconciliationEntry] = []
    matched_ids: set[uuid.UUID] = set()
    matched_count = 0
    mismatched_count = 0

    # Build lookup: (sender, receiver, currency) -> list of invoices
    from collections import defaultdict

    sender_map: dict[tuple, list[ICInvoice]] = defaultdict(list)
    for inv in invoices:
        key = (inv.sender_site_id, inv.receiver_site_id, inv.currency)
        sender_map[key].append(inv)

    # Try to match: for each (A->B, currency), find corresponding (B->A, currency)
    processed_pairs: set[tuple] = set()
    for (sender, receiver, currency), sender_invs in sender_map.items():
        pair_key = tuple(sorted([(sender, receiver), (receiver, sender)])) + (currency,)
        if pair_key in processed_pairs:
            continue
        processed_pairs.add(pair_key)

        receiver_invs = sender_map.get((receiver, sender, currency), [])

        # Match by amount
        unmatched_senders = list(sender_invs)
        unmatched_receivers = list(receiver_invs)

        for s_inv in list(unmatched_senders):
            for r_inv in list(unmatched_receivers):
                if s_inv.amount == r_inv.amount and s_inv.id not in matched_ids and r_inv.id not in matched_ids:
                    entries.append(
                        ICReconciliationEntry(
                            sender_invoice=ICInvoiceResponse.model_validate(s_inv),
                            receiver_invoice=ICInvoiceResponse.model_validate(r_inv),
                            match_status="matched",
                            difference=Decimal("0"),
                        )
                    )
                    matched_ids.add(s_inv.id)
                    matched_ids.add(r_inv.id)
                    unmatched_senders.remove(s_inv)
                    unmatched_receivers.remove(r_inv)
                    matched_count += 1
                    break

        # Check for amount mismatches (same pair, different amounts)
        for s_inv in list(unmatched_senders):
            for r_inv in list(unmatched_receivers):
                if s_inv.id not in matched_ids and r_inv.id not in matched_ids:
                    entries.append(
                        ICReconciliationEntry(
                            sender_invoice=ICInvoiceResponse.model_validate(s_inv),
                            receiver_invoice=ICInvoiceResponse.model_validate(r_inv),
                            match_status="amount_mismatch",
                            difference=abs(s_inv.amount - r_inv.amount),
                        )
                    )
                    matched_ids.add(s_inv.id)
                    matched_ids.add(r_inv.id)
                    unmatched_senders.remove(s_inv)
                    unmatched_receivers.remove(r_inv)
                    mismatched_count += 1
                    break

        # Remaining unmatched
        for s_inv in unmatched_senders:
            if s_inv.id not in matched_ids:
                entries.append(
                    ICReconciliationEntry(
                        sender_invoice=ICInvoiceResponse.model_validate(s_inv),
                        receiver_invoice=None,
                        match_status="unmatched_sender",
                        difference=None,
                    )
                )
                matched_ids.add(s_inv.id)

        for r_inv in unmatched_receivers:
            if r_inv.id not in matched_ids:
                entries.append(
                    ICReconciliationEntry(
                        sender_invoice=None,
                        receiver_invoice=ICInvoiceResponse.model_validate(r_inv),
                        match_status="unmatched_receiver",
                        difference=None,
                    )
                )
                matched_ids.add(r_inv.id)

    unmatched_count = len([e for e in entries if e.match_status.startswith("unmatched")])

    return ICReconciliationReport(
        year=year,
        month=month,
        total_invoices=len(invoices),
        matched_count=matched_count,
        unmatched_count=unmatched_count,
        mismatched_count=mismatched_count,
        entries=entries,
    )


# ---------------------------------------------------------------------------
# IC Loans
# ---------------------------------------------------------------------------


@router.get("/loans", response_model=ICLoanListResponse)
async def list_ic_loans(
    db: DbSession,
    current_user: CurrentUser,
    site_id: uuid.UUID | None = Query(None),
    status_filter: ICLoanStatus | None = Query(None, alias="status"),
) -> ICLoanListResponse:
    """List intercompany loans, optionally filtered by site or status."""
    stmt = select(ICLoan)

    if site_id is not None:
        await require_site_access(site_id, current_user)
        stmt = stmt.where(
            (ICLoan.lender_site_id == site_id) | (ICLoan.borrower_site_id == site_id)
        )

    if status_filter is not None:
        stmt = stmt.where(ICLoan.status == status_filter)

    stmt = stmt.order_by(ICLoan.start_date.desc())

    result = await db.execute(stmt)
    loans = result.scalars().all()

    return ICLoanListResponse(
        items=[ICLoanResponse.model_validate(loan) for loan in loans],
        total=len(loans),
    )


@router.post("/loans", response_model=ICLoanResponse, status_code=status.HTTP_201_CREATED)
async def create_ic_loan(
    body: ICLoanCreate,
    db: DbSession,
    current_user: CurrentUser,
    audit_log: AuditLogger,
) -> ICLoanResponse:
    """Create a new intercompany loan."""
    await require_site_access(body.lender_site_id, current_user)

    if body.lender_site_id == body.borrower_site_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Lender and borrower sites must be different",
        )

    loan = ICLoan(
        lender_site_id=body.lender_site_id,
        borrower_site_id=body.borrower_site_id,
        currency=body.currency,
        principal_amount=body.principal_amount,
        interest_rate=body.interest_rate,
        start_date=body.start_date,
        maturity_date=body.maturity_date,
        outstanding_balance=body.outstanding_balance,
        status=body.status,
        created_by=current_user.id,
    )
    db.add(loan)
    await db.flush()
    await db.refresh(loan)

    await audit_log(
        "create",
        "ic_loan",
        str(loan.id),
        site_id=body.lender_site_id,
        details={
            "lender_site_id": str(body.lender_site_id),
            "borrower_site_id": str(body.borrower_site_id),
            "principal": str(body.principal_amount),
            "currency": body.currency,
        },
    )

    return ICLoanResponse.model_validate(loan)


@router.get("/loans/summary", response_model=ICLoanSummaryResponse)
async def ic_loan_summary(
    db: DbSession,
    current_user: CurrentUser,
) -> ICLoanSummaryResponse:
    """Get summary of outstanding IC loans, grouped by site pair."""
    stmt = (
        select(
            ICLoan.lender_site_id,
            ICLoan.borrower_site_id,
            ICLoan.currency,
            func.sum(ICLoan.outstanding_balance).label("total_outstanding"),
            func.count(ICLoan.id).label("loan_count"),
        )
        .where(ICLoan.status == ICLoanStatus.active)
        .group_by(ICLoan.lender_site_id, ICLoan.borrower_site_id, ICLoan.currency)
    )

    result = await db.execute(stmt)
    rows = result.all()

    pairs = [
        ICLoanSitePairSummary(
            lender_site_id=row.lender_site_id,
            borrower_site_id=row.borrower_site_id,
            currency=row.currency,
            total_outstanding=row.total_outstanding,
            loan_count=row.loan_count,
        )
        for row in rows
    ]

    total = sum(p.total_outstanding for p in pairs)

    return ICLoanSummaryResponse(total_outstanding=total, pairs=pairs)


__all__ = ["router"]
