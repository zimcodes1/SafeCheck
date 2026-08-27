from sqlmodel import SQLModel, Field, CheckConstraint
from datetime import datetime, timezone

class Reading(SQLModel, table=True):
    id:int | None = Field(primary_key=True)
    timestamp: datetime = Field(nullable=False, default_factory=lambda: datetime.now(timezone.utc))
    water_level: float = Field(nullable=False, ge=0, le=100)
    valve_state: bool = Field(nullable=False)
    source: str = Field(nullable=False, default="plant")