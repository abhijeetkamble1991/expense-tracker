import re

from app.services.parsers.base import ParsedRow

UPI_LINE = re.compile(
    r"(?P<date>\d{2}/\d{2}/\d{4})\s+"
    r"(?P<description>UPI/[^\n]+?)\s+"
    r"(?P<amount>\d+\.\d{2})\s+"
    r"(?P<direction>DR|CR)"
)


def parse_upi_statement_text(raw_text: str) -> list[ParsedRow]:
    rows: list[ParsedRow] = []

    for match in UPI_LINE.finditer(raw_text):
        if match.group("direction") != "DR":
            continue

        description = match.group("description").strip()
        parts = description.split("/")
        merchant_guess = parts[1] if len(parts) > 1 else description
        source_reference = parts[-1] if len(parts) > 2 else None

        rows.append(
            ParsedRow(
                transaction_date=match.group("date"),
                posted_date=None,
                amount=match.group("amount"),
                description=description,
                merchant_guess=merchant_guess,
                direction="debit",
                source_reference=source_reference,
            )
        )

    return rows
