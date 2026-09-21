# SafeCheck — Architecture Change: Passive Command Detection

This document replaces the self-reporting design described in the Implementation Plan, the Data Models & Endpoints Guide, the Backend Roadmap, and the Attack Scripts Roadmap. It exists because those docs had the Backend depending on every client — including the attack scripts — voluntarily confessing what they'd just done, which is not how detection works against a real, uncooperative adversary, and not what the track brief actually asked for.

---

## 1. Why This Change

The track brief assumes an attacker sending "perfectly valid, well formatted commands" — nothing in that framing implies the attacker cooperates with your detector. The brief's own free-tools list names Wireshark specifically, which is a passive packet-capture tool — the intended posture is watching the wire, not asking senders to self-identify. The old design would not have worked against a real, uncooperative attacker, only against your own honestly-behaved test scripts, which defeats the purpose of building a detector at all.

**A side benefit worth naming:** this change also removes a genuine logical contradiction the old Replay attack had — it needed to *report* its real "open valve" command to the Backend while simultaneously trying to *hide* the tank's true state from that same Backend. An attacker that tells on itself while also trying to stay hidden doesn't make sense. Passive detection resolves this cleanly: the attacker never has to tell anyone anything, ever.

---

## 2. What's Being Replaced — Summary

| Old (self-reporting) | New (passive) |
|---|---|
| Every client calls `POST /commands/report` after writing to Modbus | Clients only write to Modbus — no HTTP call, no cooperation, no confession |
| `source_id` is whatever string the client claims to be | Source is the observed TCP connection (IP + port) the write actually came from |
| Layers 1–2 fire synchronously inside the `/commands/report` request handler | Layers 1–2 fire from the poller, the same place Layers 3–4 already fired from |
| `Command` rows only exist for traffic that chose to report itself | `Command` rows exist for every write that actually happened, full stop |
| An attacker who simply didn't call the endpoint would be invisible | Every write is visible, because the Backend is reading the same registers the Plant obeys |

The **Detector's actual logic — all four layers — is unchanged.** Nothing about what counts as unsafe changes. What changes is purely how a command's existence becomes known to the Backend in the first place.

---

## 3. The New Detection Mechanism: Poller-Based Register Diffing

The Backend's poller already runs every tick to read the Plant's **input** registers for `readings`. It now also reads the Plant's **holding** registers — the same ones every client writes commands to — on the same tick, and compares them against what it read last time.

**Per tick, the poller now does:**
1. Read input registers (water level, pump status, valve status) → save as a `Reading` row, exactly as before.
2. Read holding registers (pump command, valve command) — new.
3. Compare each holding register's current value against the value the poller saw on the *previous* tick.
4. If the pump command register changed, that's an inferred command: `command_type = "pump"`, `value` = the new register value. Same for the valve command register.
5. For each inferred command, create a `Command` row and immediately call `evaluate_command()` — the same Layer 1–2 function as before, just triggered from here instead of from an API request.
6. Continue as before: `evaluate_reading()` (Layers 3–4) still runs against the new `Reading` row on the same tick.

```python
# app/services/poller.py — shape only
_last_known_commands = {"pump": None, "valve": None}

def poll_once():
    reading = read_input_registers()
    save_reading(reading)
    evaluate_reading(reading)

    commands = read_holding_registers()
    for command_type, value in commands.items():
        previous = _last_known_commands[command_type]
        if previous is not None and value != previous:
            command = save_inferred_command(command_type, value)
            evaluate_command(command)
        _last_known_commands[command_type] = value
```

**First-tick baseline handling:** on the very first poll after the Backend starts, there's no "previous" value to compare against — treat that first read as the baseline only, don't evaluate it as a command event, or you'll generate a phantom alert every time the Backend restarts.

**A real limitation, worth stating plainly in your write-up:** detection latency is now bounded by `poll_interval_seconds`. A command sent and reverted faster than one poll cycle could be missed entirely — a true packet-capture sensor watching the wire in real time wouldn't have this gap. This is the honest trade-off of "buildable by Monday" versus "a real Wireshark-based sensor," and it's worth naming directly rather than leaving a judge to find it. Section 8 below covers what a real upgrade path would look like if you ever have time for it.

---

## 4. Identifying the Source — Without Trusting a Confession

Modbus itself carries no sender identity in its payload — this hasn't changed. But the Backend can observe the **TCP connection** each write arrives on, which is information the sender can't opt out of providing, unlike a self-report.

**Do this — it's cheap and worth it:** have each script (Legit Client and every attack) bind its outgoing Modbus connection to a fixed, distinct local source port before connecting, instead of letting the OS pick a random one. This costs a couple of lines per script and means the Backend — or you, reviewing logs after a demo run — can tell which stream is which just from the connection metadata, without needing to trust anything the sender says about itself.

| Script | Suggested local source port |
|---|---|
| Legit Client | `6001` |
| Injection | `6002` |
| Wrong Moment | `6003` |
| Slow Drift | `6004` |
| Replay | `6005` |
| Maintenance Scenario | `6006` |

Since Modbus itself doesn't carry this, capturing it requires reading the connecting socket's address on the **Plant server's** side (pymodbus exposes the client address per-connection through its request handler) and either logging it directly, or exposing it somewhere the Backend's poller can correlate against — the simplest version for your timeline is: the Plant's own per-second state log (the one you already added) also logs which source port most recently wrote to each holding register, and the Backend's `Command.source_id` field gets populated from that same observation rather than from a claimed string. This is now an **observed fact**, not a self-declared one — a real improvement in your design, worth stating as such.

If wiring that connection all the way through by Monday isn't realistic, a simpler fallback that still removes the trust problem: leave `source_id` as `"unknown"` for now, and rely on your own demo narration ("this is the injection attack, running now") plus the timestamp correlation in your alert history to make the connection obvious to judges. The detection itself doesn't depend on knowing the source — only the severity messaging loses a little color without it.

---

## 5. Backend Changes Required

**`app/services/modbus_client.py`** — add `read_holding_registers()`, alongside the existing `read_plant_state()` (which continues to read input registers only). Both use the same shared register map constants from the Plant's `registers.py`/`register_map.md` — no new registers, no new contract.

**`app/services/poller.py`** — restructure `poll_once()` per Section 3: read both register banks, diff holding registers against `_last_known_commands`, call `evaluate_command()` on any changed value, keep calling `evaluate_reading()` as before. This is now the single place all four Detector layers get triggered from — a simplification over the old split-trigger design.

**`app/routes/commands.py`** — `POST /commands/report` is removed from the real detection path. You can either delete it outright, or keep it as an unused debug utility clearly marked as not part of the live pipeline — but nothing in the actual system should call it anymore.

**`app/detector/engine.py`** — `evaluate_command()` and `evaluate_reading()` stay exactly as already built; only their caller changes, from a route handler to the poller. No logic inside either function needs to change.

**`app/models/command.py`** — no schema change required. `source_id` simply changes meaning: previously "whatever string the client claimed," now "what the Backend actually observed" (Section 4) — worth a one-line comment in the model file itself noting this, so nobody re-adds a self-report path later without realizing why it was removed.

---

## 6. Legit Client Changes

**Remove entirely:** the Backend HTTP call. `report_command()` from the old `client_helper.py` shrinks down to just the Modbus write — the whole reason it existed was to do both actions, and now there's only one.

**Keep exactly as last discussed:** the operator cycle itself, including the water-level guard before starting a fill phase (don't send `pump = on` if the last drain didn't bring the level down far enough), and randomized wait durations for demo-visual distinctness from the Slow Drift attack.

**Add:** bind to local source port `6001` (Section 4) before connecting.

**Net effect:** this script gets simpler, not more complex — one less thing to build and one less thing that can fail (a Backend outage no longer needs graceful handling in this script at all, since it never talks to the Backend).

---

## 7. Attack Script Changes

The same simplification applies to every one of these: drop the HTTP-reporting half of what used to be `report_command()`, keep the Modbus-write half, bind to the assigned local port. Everything about *when* and *what* each script sends is otherwise unchanged from the Attack Scripts Roadmap.

**Injection** — read current pump state, send the opposite value once. Unaffected otherwise.

**Wrong Moment** — unaffected otherwise: close the valve, turn the pump on while safe, poll water level directly via Modbus (as it already did — this script never depended on reporting), wait for the level to cross the danger threshold, then send the redundant "reaffirm pump on" command as the deliberate trigger.

**Slow Drift** — unaffected: this attack was always readings-driven (Layer 4 watches trend, not individual commands), so it never depended on reporting at all.

**Replay** — this is where the change matters most, and fixes the earlier contradiction (Section 1). The script still captures a snapshot and rewrites the Plant's input registers on a fast loop to keep them frozen, and still separately writes a real "valve open" command to the holding register so the true tank state drains underneath — but now it does this entirely through Modbus, with no confession to the Backend at any point. The attack is now internally consistent: it hides everything it can, and nothing it does gives it away except the thing your Detector is actually designed to notice.

**Maintenance Scenario** — unaffected: pump forced off for the entire run, valve cycled open/closed. Simpler now for the same reason as the Legit Client — no Backend dependency to handle failures for.

---

## 8. Optional Stretch — If You Get a Spare Afternoon Before Monday

Not required, and don't chase this unless everything in Sections 3–7 is solid and tested first. If you want to genuinely close the poll-interval latency gap named in Section 3, the real upgrade is packet capture rather than polling: use a library like `scapy` to sniff raw TCP traffic on the Plant's port directly, parse Modbus TCP's function codes (6 = write single register, 16 = write multiple registers) out of the packets, and feed detected writes to `evaluate_command()` in true real time instead of once per poll tick. This is a legitimately bigger build — new dependency, raw socket/packet handling, Modbus TCP framing knowledge — so treat it as a "if there's time" upgrade, not a blocker for Monday.

**A lower-effort way to still honor the brief's Wireshark mention without building this:** just open Wireshark live during your demo, filtering on the Plant's port, and let judges watch raw, unauthenticated Modbus write requests scroll by in real time as you narrate. It's a genuinely strong visual moment for the "this protocol has zero authentication, anyone who can reach it can send it commands" point your whole project is built on — and it costs you nothing to build, since Wireshark is just an observer sitting outside your system, not a code dependency.

---

## 9. What Stays Exactly The Same

Worth confirming explicitly, since it's most of the system: the Plant server's physics, tick loop, and register map are untouched. The Detector's actual four-layer logic (sanity, state-machine, replay, drift) is untouched — only its trigger point moved. The `readings`, `commands`, and `alerts` data models are untouched (`source_id`'s meaning shifts, its shape doesn't). The Dashboard is untouched — it only ever consumed `GET /plant/live`, `GET /alerts`, and the history endpoints, and never knew or cared how a command got into the system in the first place.

---

## 10. Action Checklist Before Monday, In Priority Order

1. Add `read_holding_registers()` to the Backend's Modbus client.
2. Rewrite `poll_once()` with the diff logic from Section 3, including the first-tick baseline guard.
3. Confirm `evaluate_command()` still fires correctly from its new caller — retest with a manual register write.
4. Strip the HTTP-reporting half out of the Legit Client and all five attack scripts — this is a deletion, should be fast.
5. Re-run the full attack suite (Attack Scripts Roadmap, Step 9) against the new pipeline — every attack needs to be confirmed working again under the new trigger path, don't assume it carries over untested.
6. If time allows: wire in the local-source-port convention from Section 4 for clean source labeling.
7. Only if 1–6 are solid with time to spare: consider Section 8's stretch upgrade, or at minimum, rehearse the live-Wireshark demo moment, since that's free and reinforces your core thesis either way.
