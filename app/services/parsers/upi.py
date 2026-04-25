import re
from datetime import datetime

from app.services.parsers.base import ParsedRow

COMPACT_UPI_LINE = re.compile(
    r"(?P<date>\d{2}/\d{2}/\d{4})\s+"
    r"(?P<description>UPI/[^\n]+?)\s+"
    r"(?P<amount>\d+\.\d{2})\s+"
    r"(?P<direction>DR|CR)"
)

PHONEPE_UPI_BLOCK = re.compile(
    r"(?P<date>[A-Z][a-z]{2} \d{1,2}, \d{4})\s+"
    r"(?P<time>\d{2}:\d{2}\s+[AP]M)\s+"
    r"(?P<description>(?:Paid to|Received from)[^\n]+)\s+"
    r"Transaction ID\s*:\s*[A-Z0-9]+\s+"
    r"UTR No\s*:\s*(?P<utr>\d+)\s+"
    r"(?:Debited from|Credited to)\s+[^\n]+\s+"
    r"(?P<direction>Debit|Credit)\s+INR\s*(?P<amount>\d+(?:,\d{3})*\.\d{2})",
    re.MULTILINE,
)


def _normalize_phonepe_date(value: str) -> str:
    return datetime.strptime(value, "%b %d, %Y").strftime("%d/%m/%Y")


def _merchant_from_phonepe_description(description: str) -> str:
    for prefix in ("Paid to ", "Received from "):
        if description.startswith(prefix):
            return description.removeprefix(prefix).strip()
    return description


def parse_upi_statement_text(raw_text: str) -> list[ParsedRow]:
    matched_rows: list[tuple[int, ParsedRow]] = []

    for match in COMPACT_UPI_LINE.finditer(raw_text):
        if match.group("direction") != "DR":
            continue

        description = match.group("description").strip()
        parts = description.split("/")
        merchant_guess = parts[1] if len(parts) > 1 else description
        source_reference = parts[-1] if len(parts) > 2 else None

        matched_rows.append(
            (
                match.start(),
                ParsedRow(
                    transaction_date=match.group("date"),
                    posted_date=None,
                    amount=match.group("amount"),
                    description=description,
                    merchant_guess=merchant_guess,
                    direction="debit",
                    source_reference=source_reference,
                    transaction_time=None,
                ),
            )
        )

    for match in PHONEPE_UPI_BLOCK.finditer(raw_text):
        if match.group("direction") != "Debit":
            continue

        description = match.group("description").strip()
        matched_rows.append(
            (
                match.start(),
                ParsedRow(
                    transaction_date=_normalize_phonepe_date(match.group("date")),
                    posted_date=None,
                    amount=match.group("amount").replace(",", ""),
                    description=description,
                    merchant_guess=_merchant_from_phonepe_description(description),
                    direction="debit",
                    source_reference=match.group("utr"),
                    transaction_time=match.group("time"),
                ),
            )
        )

    matched_rows.sort(key=lambda item: item[0])
    return [row for _, row in matched_rows]
