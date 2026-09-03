from fastapi import APIRouter, HTTPException
from typing import Optional
from app.schemas import CommandIn, CommandOut
from app.detector.engine import evaluate_command
from app.schemas.alert import AlertOut

router = APIRouter(prefix="/commands", tags=["Client Command"])


@router.post("/report")
async def report_command(command: CommandIn) -> dict:
    try:
        # Evaluate the command; engine returns (saved_command_payload, alert_payload).
        saved_command, alert = evaluate_command(command)

        response: dict = {}
        if saved_command:
            response["command"] = CommandOut.model_validate(saved_command)
        else:
            response["command"] = None

        response["alert"] = AlertOut.model_validate(alert) if alert else None
        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))