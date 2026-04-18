import json
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    month_key: Mapped[str] = mapped_column(String(7), index=True)
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    parser_type: Mapped[str] = mapped_column(String(30), nullable=False)
    parse_status: Mapped[str] = mapped_column(String(30), nullable=False)
    extracted_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    flagged_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    warnings_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    @property
    def warnings(self) -> list[str]:
        return json.loads(self.warnings_json)

