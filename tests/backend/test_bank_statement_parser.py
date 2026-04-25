from pathlib import Path

from app.services.parsers.bank_statement import parse_bank_statement_text


def test_parse_bank_statement_text_extracts_only_debit_expenses():
    raw_text = Path("tests/backend/fixtures/bank_statement_axis.txt").read_text()

    rows = parse_bank_statement_text(raw_text)

    assert [row.transaction_date for row in rows] == [
        "19/01/2026",
        "21/01/2026",
        "23/01/2026",
        "18/04/2026",
    ]
    assert [row.amount for row in rows] == ["3645.00", "1288.00", "526.40", "7407.00"]
    assert rows[0].merchant_guess == "MOB/SELFFT/915010052853322/915010052853/322"
    assert rows[1].merchant_guess == "URBAN COMPANY"
    assert rows[1].source_reference == "817827336319"
    assert rows[2].merchant_guess == "ZOMATO"
    assert all(row.direction == "debit" for row in rows)
