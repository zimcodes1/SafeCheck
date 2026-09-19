# SafeCheck — Real Passive Detection: Parsing Live Modbus Traffic

This supersedes the previous doc's framing. Register polling — even Backend-side diffing — is still the Backend *asking* the Plant a question on a schedule. What this document builds instead is a sniffer that sits on the wire, parses every Modbus TCP frame as it passes, and reacts to what it actually sees, in real time, with zero cooperation from anyone and zero dependency on a poll interval. This is what the brief means by Wireshark and by "catching a malformed packet."

The previous doc's polling-diff mechanism doesn't get thrown away — it becomes a fallback layer (Section 7), not the main story. Nothing you already built there is wasted.

---

## 1. What You're Actually Parsing — Modbus TCP Frame Structure

Every Modbus TCP message (an "ADU" — Application Data Unit) is a fixed 7-byte header (the MBAP header) followed by the actual instruction (the PDU). This is the whole vocabulary a passive sniffer needs to understand:

| Bytes | Field | Meaning |
|---|---|---|
| 0–1 | Transaction ID | Sender-chosen, echoed back in the response — used to match requests to replies |
| 2–3 | Protocol ID | Always `0x0000` for Modbus. Anything else is already malformed |
| 4–5 | Length | Number of bytes remaining in the frame after this field |
| 6 | Unit ID | Which device this is addressed to (irrelevant for our single-Plant setup, but still checkable) |
| 7 | Function Code | What kind of operation this is |
| 8+ | Data | Depends on the function code |

**Function codes that matter to you:**

| Code | Meaning | Relevance |
|---|---|---|
| `0x03` (3) | Read Holding Registers | Normal, not a command — ignore for detection purposes |
| `0x04` (4) | Read Input Registers | Normal, not a command — ignore |
| `0x06` (6) | Write Single Register | **This is a command.** Data = 2-byte register address + 2-byte value |
| `0x10` (16) | Write Multiple Registers | Also a command, rarely needed here since you only ever write one register at a time, but worth handling |
| Anything else | Unexpected | Flag as suspicious — not a function code your system should ever legitimately see |

For a `0x06` write, the data bytes tell you exactly what happened: which register address was targeted, and what value was written — meaning you can reconstruct "pump set to on" or "valve set to closed" directly from the raw bytes, with nothing inferred, nothing polled.

---

## 2. Malformed Packet Catalog — Layer 1, For Real This Time

The brief calls this "the easy case," and it's worth taking that seriously — it should genuinely be easy once the sniffer exists, because it's just structural validation on bytes you already have in hand. This is what Layer 1 should actually check now, instead of the placeholder range-check it was doing before:

- **Protocol ID isn't `0x0000`** — a real Modbus client would never send this; something is either broken or hand-crafting frames.
- **Length field doesn't match the actual remaining byte count** — a mismatched length is a classic sign of a hand-built or corrupted packet.
- **Function code isn't one your system recognizes** — anything outside the small set above is worth flagging.
- **Register address in a write is outside the two you actually use** (pump/valve command registers from the register map) — someone's writing to a register that shouldn't exist in your system.
- **Value in a write is outside the valid range** (not `0` or `1`) — same idea as before, just now checked against the real byte value instead of an already-cleaned API payload.
- **Frame is truncated** — fewer bytes arrived than the header claims should exist.

Every one of these should produce an `Info`-or-higher alert with the **raw hex bytes attached** to the alert detail. That raw dump is a genuinely good demo artifact — being able to show a judge "here's the literal malformed bytes we caught, unparseable garbage sent straight at the register" is a much stronger moment than a clean, already-validated JSON payload ever was.

---

## 3. The Sniffer — Design

**Primary approach: raw packet capture.** Use `scapy` to sniff on the loopback interface, filtered to the Plant's TCP port, and hand every captured packet's TCP payload to a Modbus frame parser.

```python
# app/services/packet_sniffer.py — shape only
def handle_packet(packet):
    if not is_request_to_plant(packet):     # dst port == plant port, has payload
        return
    raw_bytes = extract_tcp_payload(packet)
    frame = parse_modbus_frame(raw_bytes)    # returns None or a raise if malformed

    if frame is None or frame.is_malformed:
        raise_malformed_packet_alert(raw_bytes, source=packet.src_ip_port)
        return

    if frame.function_code in (WRITE_SINGLE, WRITE_MULTIPLE):
        command = build_command_from_frame(frame, source=packet.src_ip_port)
        evaluate_command(command)   # same Layer 1–2 function as before

def start_sniffer():
    scapy.sniff(iface=SNIFF_INTERFACE, filter=f"tcp port {PLANT_PORT}", prn=handle_packet, store=False)
```

**Only look at requests, not responses.** The Plant's own replies (echoing the write back) travel the other direction — filter on destination port matching the Plant's port so you're not double-parsing both halves of every exchange.

**Source identification comes for free here.** Unlike the polling-diff approach, you now have the real source IP and source port straight from the captured packet's headers — no self-reporting, no local-port-binding convention needed as a workaround (though it's still a nice-to-have for readable logs). This is the genuine, unfakeable-within-your-network identity signal a real IDS would use.

---

## 4. Practical Requirements — Read Before Building

These are the things that will actually bite you if you don't plan for them now:

**Raw packet capture needs elevated privileges.** On Linux/macOS, run the sniffer with `sudo` (or grant `CAP_NET_RAW` to the Python interpreter). On Windows, `scapy` needs Npcap installed and typically an Administrator shell. **Test this on your actual demo machine well before Monday** — this is the single most likely thing to quietly fail on stage if it's only ever been tested on one dev's laptop.

**Loopback interface naming differs by OS.** Linux: `lo`. macOS: `lo0`. Windows via Npcap: a device path, not a friendly name. Make this configurable (an environment variable), don't hardcode it — you will likely run this on more than one machine before Monday.

**TCP segment reassembly isn't handled.** A full implementation would reassemble multi-packet TCP streams before parsing. Your Modbus write frames are tiny (well under 20 bytes total) and will essentially always land in a single packet — treating one captured packet as one frame is a reasonable, honest simplification for this scope. State this explicitly in your write-up as a known limitation, not something to silently rely on without mentioning.

**Thread safety with SQLite.** The sniffer callback fires on its own thread, separate from the poller. If both ever try to write to `safecheck.db` at the same moment, a naive SQLite setup can throw a "database is locked" error. Fix: open the SQLite connection with `check_same_thread=False` and either enable WAL mode or wrap writes in a simple lock — don't skip this, it's the kind of bug that only shows up under the exact load conditions of a live demo.

---

## 5. Alert Creation Still Goes Through the Same Pipeline

Nothing about `evaluate_command()`, `evaluate_reading()`, or the `Alert`/`Command` models changes. The sniffer is purely a new, better **source of truth for when a command happened** — it replaces the trigger mechanism, not the detection logic already built. This matters for how much of your existing work survives: Layers 2, 3, and 4 don't need to be touched at all.

---

## 6. Attack Scripts — One Addition Worth Making

Every attack script from before works completely unchanged — they still just write to Modbus, and now the sniffer sees that write happen on the wire instead of the Backend inferring it from a poll. No changes needed there.

**Worth adding, since it's genuinely cheap and directly named in the brief:** a sixth script, `malformed_packet/attack.py`, that opens a raw TCP socket to the Plant's port and sends deliberately broken bytes — a wrong protocol ID, a truncated frame, a bogus function code, a write to a register address that doesn't exist. This is a few lines of raw socket code, no Modbus library needed at all (you're not sending a valid Modbus message on purpose), and it directly exercises the Layer 1 catalog from Section 2. Given how cheap it is and how directly the brief calls this case out, build it.

---

## 7. The Old Polling-Diff Mechanism — Now a Fallback, Not the Primary Path

Keep it. Don't rip it out. Reframe it: if the sniffer ever fails to start (privilege issue on an unfamiliar demo machine, interface misconfiguration, whatever), the polling-diff poller from the previous doc still independently catches every command, just at coarser (poll-interval) latency instead of real time. Running both simultaneously — sniffer as primary, poller-diff as backup — is legitimate defense-in-depth, not redundant waste, and it means a demo-day sniffer failure degrades your system instead of breaking it. Worth one line in your write-up framing it exactly that way.

---

## 8. Action Checklist Before Monday, In Priority Order

1. Write `parse_modbus_frame()` against the structure in Section 1 — test it standalone first, feeding it captured byte sequences by hand, before wiring it to live traffic at all.
2. Build the malformed-packet catalog checks from Section 2 against that parser.
3. Get `scapy` sniffing on your loopback interface and confirm you can see *any* traffic on the Plant's port — this alone is worth testing in isolation before adding parsing on top.
4. Wire parsed writes into `evaluate_command()`, confirm Layer 2 still fires correctly with real packet-sourced commands.
5. Fix SQLite thread-safety (Section 4) — don't skip this, test it under simultaneous sniffer + poller writes specifically.
6. Test the privilege/permissions setup on the actual machine you'll demo from, not just your main dev machine.
7. Build the `malformed_packet` attack script (Section 6) — cheap, and it's the case the brief names directly.
8. Confirm the old poller-diff mechanism still runs correctly alongside the sniffer as a fallback (Section 7), not instead of it.
9. Re-run the full attack suite one more time against the finished pipeline — every attack, including the new malformed-packet one, confirmed working end to end.
