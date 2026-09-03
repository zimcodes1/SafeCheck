from __future__ import annotations

from typing import Optional, Tuple

from app.database import engine
from app.detector.layer1_sanity import check_sanity
from app.detector.layer2_state_machine import check_state_validity
from app.models.alert import Alert, ConfidenceEnum, RulesEnum, SeverityEnum
from app.models.command import Command, CommandType
from app.schemas.command import CommandIn
from sqlmodel import Session
from app.detector.layer3_replay import check_for_replay
from app.models.reading import Reading
from app.schemas.reading import ReadingOut
from typing import List
from sqlmodel import select
from app.detector.layer4_drift import check_for_drift


def evaluate_command(
    command: CommandIn,
    current_plant_state: Optional[dict] = None,
) -> Tuple[Optional[dict], Optional[dict]]:
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
        # Do not persist malformed commands that fail basic validation; create
        # an alert instead so operators can investigate the bad input.
        alert = Alert(
            severity=SeverityEnum.WARNING,
            rule_triggered=RulesEnum.SANITY_CHECK,
            related_command_id=None,
            message=(
                f"Invalid command: {sanity_reason}. "
                "The command failed basic validation and was rejected."
            ),
            confidence=ConfidenceEnum.CERTAIN,
        )
        with Session(engine) as session:
            session.add(alert)
            session.commit()
            session.refresh(alert)

            alert_payload = {
                "id": alert.id,
                "severity": alert.severity,
                "rule_triggered": alert.rule_triggered,
                "related_command_id": alert.related_command_id,
                "message": alert.message,
                "confidence": alert.confidence,
            }
        return None, alert_payload

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


def evaluate_reading(reading: ReadingOut, window: List[ReadingOut]) -> Tuple[Optional[dict], Optional[dict]]:
    """Evaluate a newly persisted `reading` using replay detection (Layer 3).

    Returns a tuple `(command_payload, alert_payload)` where `alert_payload` is
    non-None when an alert was created. `command_payload` is unused here but kept
    for signature compatibility; both are plain dicts when returned.
    """
    # Run replay detector (Layer 3)
    ok_replay, reason_replay = check_for_replay(reading, window)

    # Run drift detector (Layer 4)
    ok_drift, reason_drift = check_for_drift(reading, window)

    # If both detectors are OK, nothing to do
    if ok_replay and ok_drift:
        return None, None

    # Prefer reporting drift if present, otherwise report replay
    if not ok_drift:
        rule = RulesEnum.DRIFT
        reason = reason_drift
    else:
        rule = RulesEnum.REPLAY
        reason = reason_replay

    alert = Alert(
        severity=SeverityEnum.WARNING,
        rule_triggered=rule,
        related_command_id=None,
        message=reason or "Anomaly detected",
        confidence=ConfidenceEnum.CERTAIN,
    )
    with Session(engine) as session:
        session.add(alert)
        session.commit()
        session.refresh(alert)
        alert_payload = {
            "id": alert.id,
            "severity": alert.severity,
            "rule_triggered": alert.rule_triggered,
            "related_command_id": alert.related_command_id,
            "message": alert.message,
            "confidence": alert.confidence,
        }
    return None, alert_payload
