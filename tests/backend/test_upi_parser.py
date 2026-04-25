from pathlib import Path

from app.services.parsers.upi import parse_upi_statement_text


def test_parse_upi_statement_text_extracts_debit_rows():
    raw_text = Path("tests/backend/fixtures/upi_statement.txt").read_text()

    rows = parse_upi_statement_text(raw_text)

    assert len(rows) == 2
    assert rows[0].description.startswith("UPI/")
    assert rows[0].amount == "425.00"
