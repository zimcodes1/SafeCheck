from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.schemas.reading import ReadingOut
from app.schemas.command import CommandOut
from typing import List, Optional
from app.database import engine
from sqlmodel import Session, select, col
from app.models.reading import Reading
from app.models.command import Command
from app.models.alert import Alert
from datetime import datetime, timezone

router = APIRouter(prefix='/history', tags=["Commands and Readings history"])


class BatchDeleteRequest(BaseModel):
    ids: List[int]


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


@router.delete("/readings/{reading_id}")
async def delete_reading(reading_id: int) -> dict:
     """Delete a single reading record by ID."""
     with Session(engine) as session:
          reading = session.get(Reading, reading_id)
          if reading is None:
               raise HTTPException(status_code=404, detail="Reading not found")
          session.delete(reading)
          session.commit()
          return {"status": "success", "message": f"Reading {reading_id} deleted"}


@router.post("/readings/batch-delete")
async def batch_delete_readings(payload: BatchDeleteRequest) -> dict:
     """Batch delete readings by list of IDs."""
     with Session(engine) as session:
          if not payload.ids:
               return {"status": "success", "deleted_count": 0}
          stmt = select(Reading).where(col(Reading.id).in_(payload.ids))
          readings = session.exec(stmt).all()
          count = len(readings)
          for r in readings:
               session.delete(r)
          session.commit()
          return {"status": "success", "deleted_count": count}


@router.delete("/readings")
async def delete_all_readings() -> dict:
     """Clear all readings from history."""
     with Session(engine) as session:
          stmt = select(Reading)
          readings = session.exec(stmt).all()
          count = len(readings)
          for r in readings:
               session.delete(r)
          session.commit()
          return {"status": "success", "deleted_count": count}


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


@router.delete("/commands/{command_id}")
async def delete_command(command_id: int) -> dict:
     """Delete a single command record by ID."""
     with Session(engine) as session:
          command = session.get(Command, command_id)
          if command is None:
               raise HTTPException(status_code=404, detail="Command not found")
          # Unlink any alerts pointing to this command
          alerts = session.exec(select(Alert).where(Alert.related_command_id == command.id)).all()
          for a in alerts:
               a.related_command_id = None
          session.delete(command)
          session.commit()
          return {"status": "success", "message": f"Command {command_id} deleted"}


@router.post("/commands/batch-delete")
async def batch_delete_commands(payload: BatchDeleteRequest) -> dict:
     """Batch delete commands by list of IDs."""
     with Session(engine) as session:
          if not payload.ids:
               return {"status": "success", "deleted_count": 0}
          # Unlink referencing alerts
          alerts = session.exec(select(Alert).where(col(Alert.related_command_id).in_(payload.ids))).all()
          for a in alerts:
               a.related_command_id = None
          stmt = select(Command).where(col(Command.id).in_(payload.ids))
          commands = session.exec(stmt).all()
          count = len(commands)
          for c in commands:
               session.delete(c)
          session.commit()
          return {"status": "success", "deleted_count": count}


@router.delete("/commands")
async def delete_all_commands() -> dict:
     """Clear all commands from history."""
     with Session(engine) as session:
          alerts = session.exec(select(Alert).where(Alert.related_command_id != None)).all()
          for a in alerts:
               a.related_command_id = None
          stmt = select(Command)
          commands = session.exec(stmt).all()
          count = len(commands)
          for c in commands:
               session.delete(c)
          session.commit()
          return {"status": "success", "deleted_count": count}