from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime, timezone
from enum import Enum

from typing import TYPE_CHECKING, Optional, List

if TYPE_CHECKING:
    from app.models.alert import Alert

class CommandType(str, Enum):
    PUMP = "pump"
    VALVE = "valve"

class Command(SQLModel, table=True):
    """Database model for recorded plant operator/attacker commands."""
    __tablename__ = "commands"

    id: int | None = Field(default=None, primary_key=True)
    timestamp: datetime = Field(nullable=False, default_factory=lambda: datetime.now(timezone.utc))
    command_type: CommandType = Field(nullable=False)
    value: bool = Field(nullable=False)
    source_id: str = Field(nullable=False)
    flagged: bool = Field(nullable=False, default=False)
    alerts: List["Alert"] = Relationship(back_populates="related_command")