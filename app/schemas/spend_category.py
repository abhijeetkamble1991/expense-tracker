from pydantic import BaseModel, ConfigDict, field_validator


class SpendCategoryCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Name cannot be blank")
        return trimmed


class SpendCategoryUpdate(SpendCategoryCreate):
    pass


class SpendCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool


class SpendCategoryDeleteResponse(BaseModel):
    deleted_id: int
    moved_to_review_count: int
