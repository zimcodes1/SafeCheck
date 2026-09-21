from fastapi import APIRouter, HTTPException
from typing import Optional
from app.schemas import CommandIn, CommandOut
from app.detector.engine import evaluate_command
from app.schemas.alert import AlertOut
from app.config import Settings
from app.services.modbus_client import read_plant_state
from app.database import engine
from app.models.reading import Reading
from sqlmodel import Session, select

router = APIRouter(prefix="/commands", tags=["Client Command"])
settings = Settings()


@router.post("/report")
async def report_command(command: CommandIn) -> dict:
    try:
        # Fetch current plant state to evaluate state-machine validity
        current_state = None
        try:
            water_level, pump_status, valve_status = await read_plant_state(
                host=settings.plant_host, port=settings.plant_port, timeout=1.0
            )
            current_state = {
                "water_level": float(water_level),
                "pump_state": bool(pump_status),
                "valve_state": bool(valve_status),
            }
        except Exception:
            # Fallback to the latest persisted reading from DB if live plant read is unavailable
            try:
                with Session(engine) as session:
                    last_reading = session.exec(
                        select(Reading).order_by(Reading.timestamp.desc()).limit(1)
                    ).first()
                    if last_reading:
                        current_state = {
                            "water_level": float(last_reading.water_level),
                            "pump_state": bool(last_reading.pump_state),
                            "valve_state": bool(last_reading.valve_state),
                        }
            except Exception:
                pass

        # Evaluate the command; engine returns (saved_command_payload, alert_payload).
        saved_command, alert = evaluate_command(command, current_plant_state=current_state)

        response: dict = {}
        if saved_command:
            response["command"] = CommandOut.model_validate(saved_command)
        else:
            response["command"] = None

        response["alert"] = AlertOut.model_validate(alert) if alert else None
        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))