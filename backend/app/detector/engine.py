from __future__ import annotations

from typing import Optional, Tuple

from app.database import engine
from app.detector.layer1_sanity import check_sanity
from app.detector.layer2_state_machine import check_state_validity
from app.models.alert import Alert, ConfidenceEnum, RulesEnum, SeverityEnum
from app.models.command import Command, CommandType
from app.schemas.command import CommandIn
from sqlmodel import Session


def evaluate_command(
    command: CommandIn,
    current_plant_state: Optional[dict] = None,
) -> Tuple[dict, Optional[dict]]:
    """Evaluate a command against Layers 1 and 2 and persist the results.

    Returns plain dictionaries containing the saved command and, if applicable,
    the created alert. This avoids DetachedInstanceError after the DB session closes.
    """
    record = Command(
        command_type=command.command_type,
        value=command.value,
        source_id=command.source_id,
        flagged=False,
    )

    sanity_ok, sanity_reason = check_sanity(command)
    if not sanity_ok:
        record.flagged = True
        alert = Alert(
            severity=SeverityEnum.WARNING,
            rule_triggered=RulesEnum.SANITY_CHECK,
            related_command_id=None,
            message=f"Sanity check failed: {sanity_reason}",
            confidence=ConfidenceEnum.CERTAIN,
        )
        with Session(engine) as session:
            session.add(record)
            session.commit()
            session.refresh(record)
            alert.related_command_id = record.id
            session.add(alert)
            session.commit()
            session.refresh(alert)

            command_payload = {
                "id": record.id,
                "command_type": record.command_type,
                "value": record.value,
                "source_id": record.source_id,
                "flagged": record.flagged,
            }
            alert_payload = {
                "id": alert.id,
                "severity": alert.severity,
                "rule_triggered": alert.rule_triggered,
                "related_command_id": alert.related_command_id,
                "message": alert.message,
                "confidence": alert.confidence,
            }
        return command_payload, alert_payload

    if current_plant_state is None:
        current_plant_state = {
            "valve_state": False,
            "pump_state": False,
            "water_level": 0.0,
            "danger_level_threshold": 95.0,
        }

    state_ok, state_reason = check_state_validity(command, current_plant_state)
    if not state_ok:
        record.flagged = True
        alert = Alert(
            severity=SeverityEnum.CRITICAL,
            rule_triggered=RulesEnum.STATE_MACHINE,
            related_command_id=None,
            message=state_reason or "State-machine validation failed.",
            confidence=ConfidenceEnum.CERTAIN,
        )
        with Session(engine) as session:
            session.add(record)
            session.commit()
            session.refresh(record)
            alert.related_command_id = record.id
            session.add(alert)
            session.commit()
            session.refresh(alert)

            command_payload = {
                "id": record.id,
                "command_type": record.command_type,
                "value": record.value,
                "source_id": record.source_id,
                "flagged": record.flagged,
            }
            alert_payload = {
                "id": alert.id,
                "severity": alert.severity,
                "rule_triggered": alert.rule_triggered,
                "related_command_id": alert.related_command_id,
                "message": alert.message,
                "confidence": alert.confidence,
            }
        return command_payload, alert_payload

    with Session(engine) as session:
        session.add(record)
        session.commit()
        session.refresh(record)
        command_payload = {
            "id": record.id,
            "command_type": record.command_type,
            "value": record.value,
            "source_id": record.source_id,
            "flagged": record.flagged,
        }
    return command_payload, None
