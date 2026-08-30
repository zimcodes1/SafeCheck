from fastapi import APIRouter, HTTPException
from app.schemas.reading import ReadingOut
from app.schemas.command import CommandOut
from typing import List
from app.database import engine
from sqlmodel import Session, select
from app.models.reading import Reading
from app.models.command import Command
from datetime import datetime, timezone

router = APIRouter(prefix='/history' , tags=["Commands and Readings history"])


@router.get("/readings")
async def get_readings_history(
     endate_time:datetime, 
     startdate_time:datetime=datetime.now(timezone.utc),
     limit:int=10, 
     offset:int=0
     ) -> List[ReadingOut]:
    try:
        with Session(engine) as session:
                statement = select(Reading).where(
                     startdate_time <= Reading.timestamp,
                     endate_time >= Reading.timestamp
                     ).offset(offset).limit(limit)
                readings = session.exec(statement).all()
                readings_list = []
                for reading in readings:
                     readings_list.append(
                          ReadingOut(
                               water_level=reading.water_level, 
                               valve_state=reading.valve_state, 
                               pump_state=reading.pump_state, 
                               timestamp=reading.timestamp, 
                               source=reading.source, 
                               id=reading.id
                               )
                               )
                return readings_list

    except Exception as e:
         error = HTTPException(status_code=500, detail=e)
         raise error

@router.get("/commands")
async def get_commands_history(
    endate_time:datetime, 
    startdate_time:datetime=datetime.now(timezone.utc),
    limit:int=10, 
    offset:int=0
) -> List[CommandOut]:
      try:
        with Session(engine) as session:
            statement = select(Command).where(
                 startdate_time <= Reading.timestamp,
                 endate_time >= Reading.timestamp
                 ).offset(offset).limit(limit)
            commands = session.exec(statement)
            commands_list = []
            for command in commands:
                 commands_list.append(CommandOut(
                      id=command.id,
                      timestamp=command.timestamp,
                      command_type=command.command_type,
                      value=command.value,
                      source_id=command.source_id,
                      flagged=command.flagged
                    ))
            return commands_list
      except HTTPException as e:
           error = HTTPException(status_code=500, detail=e)
           raise error