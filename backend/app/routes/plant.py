from fastapi import APIRouter, HTTPException
from app.schemas import PlantLiveResponse
from app.services.modbus_client import read_plant_state
from app.config import Settings
from datetime import datetime

settings = Settings()
router = APIRouter(prefix="/plant", tags=["Live plant connection"])

@router.get('/live', response_model=PlantLiveResponse)
async def read_live_state():
    try:
        water_level, pump_status, valve_status = await read_plant_state(host=settings.plant_host, port=settings.plant_port)
        return PlantLiveResponse(water_level=water_level, pump_state=bool(pump_status), valve_state=bool(valve_status), timestamp=datetime.utcnow())

    except Exception as e:
        error = HTTPException(status_code=500, detail=str(e))
        raise error