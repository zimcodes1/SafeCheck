from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel
from sqlmodel import Session, col, select

from app.database import engine
from app.models.alert import Alert
from app.schemas.alert import AlertDetail, AlertOut

router = APIRouter(prefix="/alerts", tags=["Alerts"])


class BatchDeleteRequest(BaseModel):
    ids: List[int]


@router.get("", response_model=List[AlertOut])
async def list_alerts(
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=1000),
) -> List[AlertOut]:
    with Session(engine) as session:
        query = select(Alert)
        if severity is not None:
            query = query.where(Alert.severity == severity)
        query = query.order_by(Alert.timestamp.desc()).limit(limit)
        alerts = session.exec(query).all()
        return [AlertOut.model_validate(alert) for alert in alerts]


@router.get("/{alert_id}", response_model=AlertDetail)
async def get_alert(alert_id: int) -> AlertDetail:
    with Session(engine) as session:
        alert = session.get(Alert, alert_id)
        if alert is None:
            raise HTTPException(status_code=404, detail="Alert not found")
        return AlertDetail.model_validate(alert)


@router.delete("/{alert_id}")
async def delete_alert(alert_id: int) -> dict:
    with Session(engine) as session:
        alert = session.get(Alert, alert_id)
        if alert is None:
            raise HTTPException(status_code=404, detail="Alert not found")
        session.delete(alert)
        session.commit()
        return {"status": "success", "message": f"Alert {alert_id} deleted"}


@router.post("/batch-delete")
async def batch_delete_alerts(payload: BatchDeleteRequest) -> dict:
    with Session(engine) as session:
        if not payload.ids:
            return {"status": "success", "deleted_count": 0}
        statement = select(Alert).where(col(Alert.id).in_(payload.ids))
        alerts = session.exec(statement).all()
        count = len(alerts)
        for a in alerts:
            session.delete(a)
        session.commit()
        return {"status": "success", "deleted_count": count}


@router.delete("")
async def delete_all_alerts(severity: Optional[str] = Query(None)) -> dict:
    with Session(engine) as session:
        query = select(Alert)
        if severity is not None:
            query = query.where(Alert.severity == severity)
        alerts = session.exec(query).all()
        count = len(alerts)
        for a in alerts:
            session.delete(a)
        session.commit()
        return {"status": "success", "deleted_count": count}
