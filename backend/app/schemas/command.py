from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone
from app.models.command import CommandType
class CommandIn(BaseModel):
    """Request model for command"""
    command_type: CommandType
    value: bool
    source_id: str

class CommandOut(BaseModel):
    """Response model for command"""
    id: int | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    command_type: str
    value: bool
    source_id: str
    flagged: bool
    model_config = ConfigDict(from_attributes=True) #Enable ORM loading