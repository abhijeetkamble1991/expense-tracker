from pathlib import Path

from app.services.parsers.upi import parse_upi_statement_text


def test_parse_phonepe_upi_statement_text_extracts_debit_rows():
    raw_text = Path("tests/backend/fixtures/phonepe_upi_statement.txt").read_text()

    rows = parse_upi_statement_text(raw_text)

    assert len(rows) == 2
    assert rows[0].transaction_date == "20/03/2026"
    assert rows[0].transaction_time == "07:05 PM"
    assert rows[0].description == "Paid to THE LIQUOR STORY 2"
    assert rows[0].merchant_guess == "THE LIQUOR STORY 2"
    assert rows[0].amount == "340.00"
    assert rows[0].source_reference == "234799728118"
    assert rows[1].transaction_time == "07:06 PM"
    assert rows[1].merchant_guess == "Vishal Wines Shop"
