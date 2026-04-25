from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImportBatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    month_key: str
    source_type: str
    original_filename: str
    parser_type: str
    parse_status: str
    extracted_count: int
    skipped_count: int
    flagged_count: int
    warnings: list[str]
    uploaded_at: datetime

