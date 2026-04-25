from pathlib import Path

from app.services.parsers.credit_card import parse_credit_card_statement_text


def test_parse_credit_card_statement_text_extracts_expected_debit_rows():
    raw_text = Path("tests/backend/fixtures/credit_card_statement.txt").read_text()

    rows = parse_credit_card_statement_text(raw_text)

    assert len(rows) == 2
    assert rows[0].description == "SWIGGY ONLINE"
    assert rows[1].merchant_guess == "AMAZON PAY INDIA"
    assert rows[0].amount == "550.00"
    assert rows[0].posted_date == "10/04/2026"
