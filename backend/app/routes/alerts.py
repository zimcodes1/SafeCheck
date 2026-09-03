from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select

from app.database import engine
from app.models.alert import Alert
from app.schemas.alert import AlertDetail, AlertOut

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertOut])
async def list_alerts(
    severity: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
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
