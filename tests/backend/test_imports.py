def test_create_import_batch(client, auth_headers, monkeypatch):
    from app.services.imports import NormalizedImportRow

    def fake_process_pdf_upload(*, db, file_bytes, filename, month_key, source_type):
        _ = db
        _ = file_bytes
        _ = filename
        _ = month_key
        _ = source_type
        return (
            {
                "source_type": "credit_card_pdf",
                "parser_type": "credit_card",
                "parse_status": "success",
                "warnings": [],
            },
            [
                NormalizedImportRow(
                    transaction_date="2026-04-09",
                    posted_date="2026-04-10",
                    amount="550.00",
                    description="SWIGGY ORDER",
                    merchant="SWIGGY ONLINE",
                    month_key="2026-04",
                    source_type="credit_card_pdf",
                    expense_category="personal",
                    review_status="needs_review",
                    source_reference="txn-001",
                )
            ],
        )

    monkeypatch.setattr(
        "app.api.routes.imports.process_pdf_upload",
        fake_process_pdf_upload,
    )

    response = client.post(
        "/imports",
        headers=auth_headers,
        data={"month_key": "2026-04", "source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["parse_status"] == "success"
    assert body["extracted_count"] == 1
