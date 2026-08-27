from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.alert import SeverityEnum, ConfidenceEnum, RulesEnum
from app.schemas.command import CommandOut

class AlertOut(BaseModel):
    """Response model for alert"""
    id: int
    timestamp: datetime
    severity: SeverityEnum
    rules_triggered: RulesEnum
    message: str
    source_id: str
    confidence: ConfidenceEnum
    model_config = ConfigDict(from_attributes=True) #Enable ORM loading

class AlertDetail(AlertOut):
    """Detailed response model for alert"""
    command: CommandOut | None = None