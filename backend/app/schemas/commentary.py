from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CommentaryCreate(BaseModel):
    site_id: uuid.UUID | None = None
    period_year: int = Field(ge=2000, le=2100)
    period_month: int = Field(ge=1, le=12)
    line_item_code: str = Field(max_length=50)
    note: str = Field(min_length=1)


class CommentaryUpdate(BaseModel):
    note: str = Field(min_length=1)


class CommentaryResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID | None
    period_year: int
    period_month: int
    line_item_code: str
    note: str
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommentaryListResponse(BaseModel):
    items: list[CommentaryResponse]
    total: int


__all__ = [
    "CommentaryCreate",
    "CommentaryUpdate",
    "CommentaryResponse",
    "CommentaryListResponse",
]
