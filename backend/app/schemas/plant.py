from pydantic import BaseModel, ConfigDict
from datetime import datetime

class PlantLiveResponse(BaseModel):
    """Response model for plant live response"""
    water_level: float
    valve_state: bool
    pump_state: bool
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True) #Enable ORM loading