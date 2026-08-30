from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.schemas.plant import PlantLiveResponse

class ReadingOut(PlantLiveResponse):
    """Response model for historical reading records."""
    id: int | None
    source: str = "plant"
