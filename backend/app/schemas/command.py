from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.command import CommandType

class CommandIn(BaseModel):
    """Request model for command"""
    command_type: CommandType
    value: bool
    source_id: str

class CommandOut(BaseModel):
    """Response model for command"""
    id: int
    timestamp: datetime
    command_type: str
    value: bool
    source_id: str
    flagged: bool
    model_config = ConfigDict(from_attributes=True) #Enable ORM loading