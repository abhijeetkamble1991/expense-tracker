import re

from app.services.parsers.base import ParsedRow

CREDIT_CARD_LINE = re.compile(
    r"(?P<transaction_date>\d{2}/\d{2}/\d{4})\s+"
    r"(?P<posted_date>\d{2}/\d{2}/\d{4})\s+"
    r"(?P<description>.+?)\s+"
    r"(?P<amount>\d+\.\d{2})\s+"
    r"(?P<direction>DR|CR)"
)


def parse_credit_card_statement_text(raw_text: str) -> list[ParsedRow]:
    rows: list[ParsedRow] = []

    for line in raw_text.splitlines():
        match = CREDIT_CARD_LINE.fullmatch(line.strip())
        if match is None or match.group("direction") != "DR":
            continue

        description = match.group("description").strip()
        merchant_guess = description.split()[0] if description else ""

        rows.append(
            ParsedRow(
                transaction_date=match.group("transaction_date"),
                posted_date=match.group("posted_date"),
                amount=match.group("amount"),
                description=description,
                merchant_guess=merchant_guess,
                direction="debit",
                source_reference=None,
            )
        )

    return rows
