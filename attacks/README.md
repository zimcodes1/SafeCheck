# SafeCheck attack scripts

All scripts speak Modbus TCP only: they never call the Backend. Start the Plant
first, then start the Backend with packet-capture privileges. Run commands from
`attacks/` using the project environment:

```bash
cd attacks
uv run python -m injection.run
uv run python -m wrong_moment.run
uv run python -m slow_drift.run --duration 30
uv run python -m maintenance_scenario.run --cycles 3
uv run python malformed_packet.attack --case bad-protocol
```

Each script has a fixed source port, making traffic visible to the passive
sensor: injection `6002`, wrong moment `6003`, slow drift `6004`, maintenance
`6006`, and malformed packets `6007`. Do not run two instances with the same
source port at once.

## Expected test results

| Script                 | Expected result                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| `injection`            | One unsolicited valid write recorded by the detector.                     |
| `wrong_moment`         | A critical Layer-2 alert after the tank reaches its high-water threshold. |
| `slow_drift`           | A Layer-4 underperformance/drift warning after enough poll samples.       |
| `maintenance_scenario` | No warning or critical alert; pump remains off.                           |
| `malformed_packet`     | A certain Layer-1 warning containing the raw hexadecimal bytes.           |

## Replay test

Modbus input registers are read-only, so replay is implemented honestly as a
small local TCP MITM proxy rather than pretending a client can write them.
Start it before the observer that should see frozen telemetry:

```bash
uv run python -m replay.run --listen-port 15020
```

Then point the Backend (and any client intended to see the replay) at
`127.0.0.1:15020`, e.g. `PLANT_PORT=15020`. The proxy forwards commands to the
real Plant on `5020`, captures the first input-register response, and replays
that response while its direct attack connection opens the real valve. For a
Layer-3 demonstration, capture the first response while the pump is on.
