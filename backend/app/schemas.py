from pydantic import BaseModel, field_validator


def _clean(value: str, limit: int) -> str:
    value = " ".join(value.split())
    if not value:
        raise ValueError("Name is required")
    if len(value) > limit:
        raise ValueError(f"Name must be {limit} characters or fewer")
    return value


class GoogleLogin(BaseModel):
    credential: str


class CategoryBody(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return _clean(value, 50)


class StartActivity(BaseModel):
    category_id: str
    name: str

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return _clean(value, 200)
