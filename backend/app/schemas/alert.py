from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.alert import SeverityEnum, ConfidenceEnum, RulesEnum
from app.schemas.command import CommandOut

class AlertOut(BaseModel):
    """Response model for alert summaries in the alert feed."""
    id: int
    timestamp: datetime
    severity: SeverityEnum
    rule_triggered: RulesEnum
    related_command_id: int | None = None
    message: str
    confidence: ConfidenceEnum
    model_config = ConfigDict(from_attributes=True)  # Enable ORM loading

class AlertDetail(AlertOut):
    """Detailed response model for a single alert with related command info."""
    related_command: CommandOut | None = None