from fastapi import APIRouter, HTTPException
from app.schemas import CommandIn, CommandOut
from app.models.command import Command
from app.database import engine
from sqlmodel import Session

router = APIRouter(prefix="/commands", tags=["Client Command"])

@router.post("/report")
def report_command(command:CommandIn) -> CommandOut:
    command_type, value, source_id = command.command_type, command.value, command.source_id
    is_flagged = False
    try:
        with Session(engine) as session:
            session.add(Command(command_type=command_type, value=value, source_id=source_id, flagged=is_flagged))
            session.commit()
            return CommandOut(command_type=command_type, source_id=source_id, value=value, flagged=is_flagged)
    except Exception as e:
        error = HTTPException(status_code=500, detail=e)
        raise e