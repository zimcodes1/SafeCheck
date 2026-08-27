from sqlmodel import Field, SQLModel
from datetime import datetime, timezone
from enum import Enum

class CommandType(str, Enum):
    PUMP = "pump"
    VALVE = "valve"

class Command(SQLModel, table=True):
    id: int | None = Field(primary_key=True)
    timestamp: datetime = Field(nullable=False, default_factory=lambda:datetime.now(timezone.utc))
    command_type: CommandType = Field(nullable=False)
    value: bool = Field(nullable=False)
    source_id: str = Field(nullable=False)
    flagged: bool = Field(nullable=False, default=False)