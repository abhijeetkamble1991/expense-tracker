from dataclasses import dataclass


@dataclass(slots=True)
class ParsedRow:
    transaction_date: str
    posted_date: str | None
    amount: str
    description: str
    merchant_guess: str
    direction: str
    source_reference: str | None
