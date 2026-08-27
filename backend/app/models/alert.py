from sqlmodel import SQLModel, Field, Relationship
from enum import Enum
from datetime import datetime, timezone
from app.models.command import Command

class SeverityEnum(str, Enum):
    INFO='info'
    WARNING='warning'
    CRITICAL='critical'

class RulesEnum(str, Enum):
    SANITY_CHECK='sanity_check'
    STATE_MACHINE='state_machine'
    REPLAY='replay'
    DRIFT='drift'

class ConfidenceEnum(str, Enum):
    CERTAIN='certain'
    NEEDS_REVIEW='needs_review'

class Alert(SQLModel, table=True):
    id: int|None = Field(primary_key=True)
    timestamp: datetime = Field(nullable=False, default_factory=lambda:datetime.now(timezone.utc))
    severity: SeverityEnum = Field(nullable=False)
    rule_triggered: RulesEnum = Field(nullable=False)
    related_command_id: int = Field(nullable=True, foreign_key="command.id")
    related_command: Command = Relationship(back_populates='alert')
    message: str = Field(nullable=False)
    confidence: ConfidenceEnum = Field(nullable=False)