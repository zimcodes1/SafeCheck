from pydantic import BaseModel, ConfigDict, field_serializer
from datetime import datetime, timezone

class PlantLiveResponse(BaseModel):
    """Response model for plant live response"""
    water_level: float
    valve_state: bool
    pump_state: bool
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True) #Enable ORM loading

    @field_serializer("timestamp")
    def serialize_timestamp(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()