import re
from decimal import Decimal

from app.services.parsers.base import ParsedRow

DATE_LINE = re.compile(r"^\d{2}-\d{2}-\d{4}$")
OPENING_BALANCE = re.compile(r"OPENING BALANCE\s+(?P<balance>\d+(?:,\d{3})*\.\d{2})")
AMOUNT_BALANCE_BRANCH = re.compile(
    r"(?P<prefix>.*?)"
    r"(?P<amount>\d+(?:,\d{3})*\.\d{2})\s+"
    r"(?P<balance>\d+(?:,\d{3})*\.\d{2})\s+"
    r"(?P<branch>\d{3})$"
)


def _parse_decimal(value: str) -> Decimal:
    return Decimal(value.replace(",", ""))


def _normalize_description(lines: list[str]) -> str:
    normalized_parts: list[str] = []
    for part in (line.strip() for line in lines if line.strip()):
        if (
            normalized_parts
            and part.isdigit()
            and "/" in normalized_parts[-1]
        ):
            normalized_parts[-1] = f"{normalized_parts[-1]}/{part}"
            continue
        normalized_parts.append(part)

    joined = " ".join(normalized_parts)
    joined = re.sub(r"\s*/\s*", "/", joined)
    joined = re.sub(r"\s+", " ", joined)
    return joined.strip()


def _merchant_from_description(description: str) -> tuple[str, str | None]:
    if description.startswith("UPI/"):
        parts = [part.strip() for part in description.split("/")]
        source_reference = parts[2] if len(parts) > 2 and parts[2] else None
        merchant_guess = parts[3] if len(parts) > 3 and parts[3] else description
        return merchant_guess, source_reference
    return description, None


def parse_bank_statement_text(raw_text: str) -> list[ParsedRow]:
    rows: list[ParsedRow] = []
    lines = [line.rstrip() for line in raw_text.splitlines()]

    opening_balance_match = OPENING_BALANCE.search(raw_text)
    previous_balance = (
        _parse_decimal(opening_balance_match.group("balance"))
        if opening_balance_match is not None
        else None
    )

    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not DATE_LINE.match(line):
          index += 1
          continue

        transaction_date = line.replace("-", "/")
        index += 1
        entry_lines: list[str] = []
        while index < len(lines):
            candidate = lines[index].strip()
            if DATE_LINE.match(candidate):
                break
            if candidate.startswith("TRANSACTION TOTAL") or candidate.startswith("CLOSING BALANCE"):
                break
            if candidate:
                entry_lines.append(candidate)
            index += 1

        if not entry_lines:
            continue

        amount_line = entry_lines[-1]
        amount_match = AMOUNT_BALANCE_BRANCH.match(amount_line)
        if amount_match is None:
            continue

        description_lines = entry_lines[:-1]
        prefix = amount_match.group("prefix").strip()
        if prefix:
            description_lines.append(prefix)

        description = _normalize_description(description_lines)
        if not description:
            continue

        amount = _parse_decimal(amount_match.group("amount"))
        current_balance = _parse_decimal(amount_match.group("balance"))

        direction = None
        if previous_balance is not None:
            if previous_balance - amount == current_balance:
                direction = "debit"
            elif previous_balance + amount == current_balance:
                direction = "credit"

        previous_balance = current_balance

        if direction != "debit":
            continue

        merchant_guess, source_reference = _merchant_from_description(description)
        rows.append(
            ParsedRow(
                transaction_date=transaction_date,
                posted_date=None,
                amount=f"{amount:.2f}",
                description=description,
                merchant_guess=merchant_guess,
                direction="debit",
                source_reference=source_reference,
            )
        )

    return rows
