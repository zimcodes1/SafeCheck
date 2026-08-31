from fastapi import APIRouter, HTTPException, Query
from app.schemas.reading import ReadingOut
from app.schemas.command import CommandOut
from typing import List, Optional
from app.database import engine
from sqlmodel import Session, select, col
from app.models.reading import Reading
from app.models.command import Command
from datetime import datetime, timezone

router = APIRouter(prefix='/history', tags=["Commands and Readings history"])


@router.get("/readings")
async def get_readings_history(
     start: Optional[datetime] = Query(None),
     end: Optional[datetime] = Query(None),
     limit: int = Query(10, ge=1, le=100),
     offset: int = Query(0, ge=0),
) -> List[ReadingOut]:
     """Return historical readings between optional `start` and `end` datetimes."""
     try:
          if end is None:
               end = datetime.now(timezone.utc)
          conditions = []
          if start is not None:
               conditions.append(Reading.timestamp >= start)
          if end is not None:
               conditions.append(Reading.timestamp <= end)

          with Session(engine) as session:
               stmt = select(Reading)
               if conditions:
                    stmt = stmt.where(*conditions)
               stmt = stmt.order_by(col(Reading.timestamp).desc()).offset(offset).limit(limit)
               readings = session.exec(stmt).all()
               return [
                    ReadingOut(
                         water_level=r.water_level,
                         valve_state=r.valve_state,
                         pump_state=r.pump_state,
                         timestamp=r.timestamp,
                         source=r.source,
                         id=r.id,
                    )
                    for r in readings
               ]

     except Exception as e:
          raise HTTPException(status_code=500, detail=str(e))


@router.get("/commands")
async def get_commands_history(
     start: Optional[datetime] = Query(None),
     end: Optional[datetime] = Query(None),
     limit: int = Query(10, ge=1, le=100),
     offset: int = Query(0, ge=0),
) -> List[CommandOut]:
     """Return historical commands between optional `start` and `end` datetimes."""
     try:
          if end is None:
               end = datetime.now(timezone.utc)
          conditions = []
          if start is not None:
               conditions.append(Command.timestamp >= start)
          if end is not None:
               conditions.append(Command.timestamp <= end)

          with Session(engine) as session:
               stmt = select(Command)
               if conditions:
                    stmt = stmt.where(*conditions)
               stmt = stmt.order_by(col(Command.timestamp).desc()).offset(offset).limit(limit)
               commands = session.exec(stmt).all()
               return [
                    CommandOut(
                         id=c.id,
                         timestamp=c.timestamp,
                         command_type=c.command_type,
                         value=c.value,
                         source_id=c.source_id,
                         flagged=c.flagged,
                    )
                    for c in commands
               ]
     except Exception as e:
          raise HTTPException(status_code=500, detail=str(e))