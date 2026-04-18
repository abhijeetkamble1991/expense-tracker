import json
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.import_batch import ImportBatch
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.imports import ImportBatchRead
from app.services.imports import find_duplicate_transaction, process_pdf_upload
from app.services.merchant_rules import find_matching_rule

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("", response_model=ImportBatchRead, status_code=status.HTTP_201_CREATED)
def upload_import(
    month_key: str = Form(...),
    source_type: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportBatch:
    _ = current_user
    file_bytes = file.file.read()
    metadata, rows = process_pdf_upload(
        db=db,
        file_bytes=file_bytes,
        filename=file.filename or "statement.pdf",
        month_key=month_key,
        source_type=source_type,
    )

    batch = ImportBatch(
        month_key=month_key,
        source_type=str(metadata["source_type"]),
        original_filename=file.filename or "statement.pdf",
        parser_type=str(metadata["parser_type"]),
        parse_status=str(metadata["parse_status"]),
        extracted_count=len(rows),
        skipped_count=0,
        flagged_count=sum(1 for row in rows if row.review_status == "flagged"),
        warnings_json=json.dumps(metadata["warnings"]),
    )
    db.add(batch)
    db.flush()

    for row in rows:
        matching_rule = find_matching_rule(db, row.merchant)
        duplicate = find_duplicate_transaction(db, incoming=row)
        transaction = Transaction(
            transaction_date=date.fromisoformat(row.transaction_date),
            posted_date=date.fromisoformat(row.posted_date) if row.posted_date else None,
            amount=Decimal(row.amount),
            description=row.description,
            merchant=row.merchant,
            raw_imported_merchant=row.raw_merchant,
            month_key=row.month_key,
            source_type=row.source_type,
            expense_category=row.expense_category,
            spend_category_id=matching_rule.spend_category_id if matching_rule else None,
            import_batch_id=batch.id,
            review_status=row.review_status,
            duplicate_suspected=duplicate is not None,
            duplicate_reason=(
                f"Matches transaction #{duplicate.id}"
                if duplicate is not None
                else None
            ),
            source_reference=row.source_reference,
        )
        db.add(transaction)

    db.commit()
    db.refresh(batch)
    return batch
