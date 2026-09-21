"""
Day 21 Sustained Integration Soak Runner.
Runs the complete system unattended (Plant, Legit Client, Poller, Attack Sequences)
for a configurable duration (default 60s or up to 10-15 minutes).

Generates comprehensive ground-truth metrics, detection rates, and false-positive verification.
Outputs summary to console and writes `day21_soak_report.json`.
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

PLANT_ROOT = ROOT.parent / "plant"
sys.path.insert(0, str(PLANT_ROOT))

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.database import engine, init_db
from app.main import app
from app.models.alert import Alert
from app.models.command import Command
from app.models.reading import Reading
from app.services.simulator import run_scenario

# Plant server imports
try:
    from server.config import PlantConfig
    from server.modbus_server import run_server_async
    from server.registers import PUMP_COMMAND_REGISTER, VALVE_COMMAND_REGISTER
except ImportError:
    from plant.server.config import PlantConfig
    from plant.server.modbus_server import run_server_async
    from plant.server.registers import PUMP_COMMAND_REGISTER, VALVE_COMMAND_REGISTER

from pymodbus.client import AsyncModbusTcpClient
from pymodbus.server import ServerAsyncStop


async def run_soak_test(duration_seconds: int = 60, poll_interval: float = 1.0):
    print("\n" + "=" * 65)
    print(f" SAFECHECK DAY 21: SUSTAINED INTEGRATION SOAK RUN ({duration_seconds}s) ")
    print("=" * 65 + "\n")

    init_db()
    client = TestClient(app)
    host = "127.0.0.1"
    port = 5020

    # Start Plant server in background
    print(f"[*] Starting Plant Modbus TCP Server on {host}:{port}...")
    plant_task = asyncio.create_task(run_server_async(host=host, port=port))
    await asyncio.sleep(0.5)

    modbus_client = AsyncModbusTcpClient(host=host, port=port)
    await modbus_client.connect()

    start_time = time.time()
    end_time = start_time + duration_seconds

    metrics = {
        "start_time": datetime.now(timezone.utc).isoformat(),
        "duration_seconds": duration_seconds,
        "legit_commands_sent": 0,
        "attacks_sent": 0,
        "readings_polled": 0,
        "alerts_generated": 0,
        "alerts_by_rule": {},
        "false_positives": 0,
        "attacks_detected": 0,
    }

    attack_schedule = [
        (0.15, "invalid_command", "Attack 1 (Sanity / Injection)"),
        (0.35, "state_machine_violation", "Attack 2 (State Machine / Wrong Moment)"),
        (0.60, "replay_stuck", "Attack 3 (Replay / Frozen Readings)"),
        (0.80, "drift_leak_rise", "Attack 4 (Slow Drift / Leak)"),
    ]
    triggered_attacks = set()

    cycle_step = 0
    # Normal operator cycle sequence
    operator_cycle = [
        {"command_type": "pump", "value": True, "source_id": "legit_operator"},
        {"command_type": "pump", "value": True, "source_id": "legit_operator"},
        {"command_type": "pump", "value": False, "source_id": "legit_operator"},
        {"command_type": "valve", "value": True, "source_id": "legit_operator"},
        {"command_type": "valve", "value": False, "source_id": "legit_operator"},
    ]

    print("[*] Starting continuous loop: poller, legit traffic, attacks, and verification...")
    try:
        while time.time() < end_time:
            elapsed = time.time() - start_time
            progress = elapsed / duration_seconds

            # 1. Simulate Plant poll via GET /plant/live
            try:
                r_live = client.get("/plant/live")
                if r_live.status_code == 200:
                    metrics["readings_polled"] += 1
            except Exception:
                pass

            # 2. Simulate Legit Operator action
            cmd = operator_cycle[cycle_step % len(operator_cycle)]
            cycle_step += 1

            r_cmd = client.post("/commands/report", json=cmd)
            metrics["legit_commands_sent"] += 1
            if r_cmd.status_code == 200:
                cmd_res = r_cmd.json()
                if cmd_res.get("alert") is not None:
                    # An alert on legit operator is a false positive!
                    metrics["false_positives"] += 1
                    print(f"  [!] False positive alert on legit command: {cmd_res['alert']}")

            # 3. Check attack schedule
            for pct, attack_name, desc in attack_schedule:
                if progress >= pct and attack_name not in triggered_attacks:
                    triggered_attacks.add(attack_name)
                    metrics["attacks_sent"] += 1
                    print(f"  [>] Triggering {desc} at t={elapsed:.1f}s...")
                    res = run_scenario(attack_name)
                    if res.get("alert"):
                        metrics["attacks_detected"] += 1
                        rule = res["alert"]["rule_triggered"]
                        metrics["alerts_by_rule"][rule] = metrics["alerts_by_rule"].get(rule, 0) + 1
                        print(f"      [✓] Caught: {rule} ({res['alert']['confidence']})")
                    else:
                        print(f"      [✗] Missed detection for {attack_name}")

            await asyncio.sleep(poll_interval)

    finally:
        modbus_client.close()
        plant_task.cancel()
        try:
            await ServerAsyncStop()
        except Exception:
            pass

    # Tally total database entries
    with Session(engine) as session:
        metrics["total_readings_in_db"] = len(session.exec(select(Reading)).all())
        metrics["total_commands_in_db"] = len(session.exec(select(Command)).all())
        metrics["total_alerts_in_db"] = len(session.exec(select(Alert)).all())

    detection_rate = (
        (metrics["attacks_detected"] / metrics["attacks_sent"] * 100)
        if metrics["attacks_sent"] > 0
        else 100.0
    )

    print("\n" + "=" * 65)
    print(" DAY 21 SOAK TEST RESULTS SUMMARY ")
    print("=" * 65)
    print(f" Elapsed Time:           {duration_seconds} seconds")
    print(f" Legit Commands Sent:    {metrics['legit_commands_sent']}")
    print(f" False Positive Alerts:  {metrics['false_positives']} (Expected: 0)")
    print(f" Attacks Launched:       {metrics['attacks_sent']}")
    print(f" Attacks Caught:         {metrics['attacks_detected']} ({detection_rate:.1f}%)")
    print(f" Total DB Readings:      {metrics['total_readings_in_db']}")
    print(f" Total DB Commands:      {metrics['total_commands_in_db']}")
    print(f" Total DB Alerts:        {metrics['total_alerts_in_db']}")
    print(f" Alerts by Detection Layer:")
    for rule, count in metrics["alerts_by_rule"].items():
        print(f"   - {rule}: {count}")
    print("=" * 65 + "\n")

    report_path = ROOT / "day21_soak_report.json"
    with open(report_path, "w") as f:
        json.dump(metrics, f, indent=2, default=str)
    print(f"Detailed soak report saved to: {report_path}")

    return metrics["false_positives"] == 0 and detection_rate == 100.0


def main():
    parser = argparse.ArgumentParser(description="Day 21 Soak Test Runner")
    parser.add_argument(
        "--duration",
        type=int,
        default=30,
        help="Duration in seconds (default: 30 for quick check, 600-900 for 10-15m full soak)",
    )
    args = parser.parse_args()

    success = asyncio.run(run_soak_test(duration_seconds=args.duration))
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

