# SafeCheck legitimate operator client

This long-running client talks only to the Plant over Modbus TCP. It has no
Backend, API, or database dependency. It binds local port `6001`, runs safe
randomized fill/drain cycles, and records actions in stdout and
`legit_client.log`.

## Run

Start the Plant first, then from the repository root run:

```bash
uv run --project plant python legitimate_client/run.py
```

For a bounded smoke test:

```bash
uv run --project plant python legitimate_client/run.py --max-cycles 3
```

Use `PLANT_HOST`, `PLANT_PORT`, and `LOCAL_SOURCE_PORT` to override defaults,
or pass `--host`, `--port`, and `--local-port`. The client retries indefinitely
after Plant restarts using the configured backoff sequence. Ctrl+C closes its
Modbus connection cleanly.

## Verify

Watch the Plant log while the client runs. Each cycle writes pump on/off then
valve open/closed; before every fill it waits for water to reach 30% or below,
keeping the valve open during extended draining. Start it at a high level to
see `GUARD_WAIT` log entries. The guard timeout may proceed only with the valve
still open, so it does not create a pump-on/closed-valve high-water condition.
