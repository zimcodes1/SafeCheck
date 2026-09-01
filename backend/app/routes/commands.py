from fastapi import APIRouter, HTTPException
from app.schemas import CommandIn, CommandOut
from app.detector.engine import evaluate_command
router = APIRouter(prefix="/commands", tags=["Client Command"])

@router.post("/report")
async def report_command(command: CommandIn) -> CommandOut:
    try:
        # Day 12: evaluate using Layers 1 and 2, and persist the command + alert.
        # This does not yet implement the later detector layers.
        saved_command, alert = evaluate_command(command)
        return CommandOut.model_validate(saved_command)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))