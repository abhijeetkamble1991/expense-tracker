from pydantic import BaseModel, ConfigDict


class SpendCategoryCreate(BaseModel):
    name: str


class SpendCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool
