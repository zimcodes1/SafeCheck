# SafeCheck — Frontend Pages & Components Guide

This document describes what the Dashboard should contain, screen by screen and component by component, and exactly which Backend endpoint each one depends on. No code here — this is the design and structure reference for whoever builds the React/TypeScript app, written so it maps directly onto the Backend Roadmap's milestones (e.g., the Live view can start being built as soon as Backend Day 6 is done; the Alerts view needs Backend Day 15).

---

## 1. App Structure — Two Pages, One Shared Shell

SafeCheck's Dashboard is a single-page app with two main views, switched via a simple tab bar — no complex routing needed for a 3-week hackathon build.

```
App
├── Shell (top bar + tab navigation, always visible)
│   ├── ConnectionStatusBadge
│   └── TabBar
│
├── Live View        (default tab)
│   ├── TankGauge
│   ├── PumpStatusLight
│   ├── ValveStatusLight
│   └── RecentAlertsStrip
│
└── Alerts View
    ├── SeverityFilterBar
    ├── AlertFeed
    │   └── AlertCard (repeated)
    └── AlertDetailPanel  (shown when a card is clicked)
```

---

## 2. Shell — Always Visible

### `ConnectionStatusBadge`
**What it shows:** a small indicator (e.g., a colored dot with a label) saying whether the Dashboard is currently able to reach the Backend at all.
**Backend dependency:** derived from whether the most recent poll to `GET /plant/live` succeeded or failed — not its own endpoint, just a status derived from the Live View's regular polling.
**Why it matters for the demo:** if the Backend or Plant ever goes down mid-demo, this is what tells you and the judges immediately, instead of the tank bar just silently freezing and everyone being confused about whether that's intentional.

### `TabBar`
**What it shows:** two tabs — "Live" and "Alerts" — with the currently active one visually distinct (e.g., underlined or filled background).
**Backend dependency:** none — pure UI state.

---

## 3. Live View

**Purpose:** the primary screen during the demo — shows the Plant's current state, updated roughly once a second, so a judge understands what's happening in under two seconds of looking at the screen.

**Polling behavior:** on a 1-second interval, calls `GET /plant/live` and updates all child components with the response. This is the single source of truth for this whole view — no component here calls the Backend independently.

### `TankGauge`
**What it shows:** a vertical fill bar or circular gauge representing `water_level` as a percentage, filling from bottom (0%) to top (100%). Include the numeric percentage as text alongside the visual, not as a replacement for it — numbers alone don't give the same instant read a judge needs.
**Visual states:**
- Normal range (roughly 10–85%): neutral color (e.g., blue).
- Near-danger (above ~85%, or below ~10% if "too empty" also matters to your danger definition): amber warning tint.
- At the actual danger threshold used by Detector Layer 2 (Backend Roadmap Day 11): red, with a subtle pulse or highlight so it's unmissable even from across a room during judging.
**Backend dependency:** `water_level` field from `GET /plant/live`.

### `PumpStatusLight` and `ValveStatusLight`
**What they show:** two small indicator lights (like a physical panel light), one labeled "Pump," one labeled "Valve," each either lit (on/open) or unlit (off/closed).
**Visual style:** keep these visually distinct from severity colors used elsewhere (Section 4) — these represent normal operational state, not danger, so a neutral "on" color like green and a neutral "off" color like grey is clearer than reusing red/amber here.
**Backend dependency:** `pump_state` and `valve_state` fields from `GET /plant/live`.

### `RecentAlertsStrip`
**What it shows:** a compact, single-line-per-item strip of the 3–5 most recent alerts, sitting below the gauge — enough to make the connection visible between "the tank did something" and "SafeCheck caught it" without leaving the Live View. Clicking any item jumps to the Alerts View with that item already selected.
**Backend dependency:** `GET /alerts` with `limit=5`, polled less frequently than the live state (e.g., every 3–5 seconds is enough — alerts don't need 1-second freshness the way tank level does).

---

## 4. Alerts View

**Purpose:** the evidence screen — this is what you'll spend the most time on during the actual judging conversation, since it's where you prove detection is working, explain false-positive handling, and show the plain-language reasoning behind each catch.

### `SeverityFilterBar`
**What it shows:** three toggle buttons — "Info," "Warning," "Critical" — allowing the viewer to narrow the feed. All three active by default (showing everything).
**Backend dependency:** passed as the `severity` query parameter on `GET /alerts` when a filter is toggled off.

### `AlertFeed`
**What it shows:** a reverse-chronological scrollable list of `AlertCard` components.
**Backend dependency:** `GET /alerts`, re-fetched whenever the filter changes, and polled periodically (e.g., every 5 seconds) to pick up new alerts without a manual refresh.

### `AlertCard`
**What it shows, per alert:**
- A severity badge (see color scheme below)
- The plain-language `message`
- A relative timestamp (e.g., "12s ago")
- Which detector layer caught it (`rule_triggered`), shown small/secondary — useful for your own team's understanding during testing, and shows judges you can explain *why*, not just *that*
**Visual states — severity color scheme, used consistently everywhere severity appears in the app:**
- `info` → grey/neutral
- `warning` → amber
- `critical` → red
**Confidence indicator:** if `confidence` is `"needs_review"`, show a small distinct marker (e.g., a dashed border or a "needs review" tag) rather than the solid styling used for `"certain"` alerts — this visually answers the brief's "what happens when the system is unsure" requirement without needing to explain it verbally every time.
**Interaction:** clicking a card opens `AlertDetailPanel` for that alert.
**Backend dependency:** rendered directly from the `AlertOut` shape returned by `GET /alerts` — no separate call needed just to render the card.

### `AlertDetailPanel`
**What it shows:** everything from `AlertCard`, expanded, plus — when present — the related command's full detail: `command_type`, `value`, `source_id`, and its own timestamp. This is where you'd point during a judge Q&A to show the full chain: here's what was sent, here's who claimed to send it, here's why it was flagged.
**Layout suggestion:** a side panel or modal, not a full page navigation — keeps the feed visible/scrollable behind it so you're not losing context while explaining one alert.
**Backend dependency:** `GET /alerts/{id}`, called once when a card is clicked.

---

## 5. Shared/Reusable Pieces Worth Building Once

These aren't full components with their own files necessarily, but patterns used in multiple places above — worth deciding early so they're consistent everywhere rather than styled differently in each view:

- **Severity color scheme** (grey/amber/red) — used in `AlertCard`, `RecentAlertsStrip`, and the danger-threshold state of `TankGauge`. Define this once (e.g., as shared style constants) rather than repeating hex codes in every component.
- **Polling pattern** — every view that polls (Live View every 1s, Alerts View every 5s) should share the same underlying "ask the Backend, update state, handle failure" behavior, differing only in interval and endpoint — this is worth factoring into one reusable piece rather than writing the polling logic three separate times.
- **Relative timestamp formatting** ("12s ago", "3m ago") — used on both `AlertCard` and `RecentAlertsStrip`.

---

## 6. Build Order, Mapped to the Backend Roadmap

Build these in this order so you're never blocked waiting on a Backend endpoint that doesn't exist yet:

1. **Shell + `TabBar`** — no Backend dependency, build anytime.
2. **`TankGauge`, status lights, `ConnectionStatusBadge`** — needs Backend Day 6 (`GET /plant/live`) done.
3. **`RecentAlertsStrip`** — needs Backend Day 15 (`GET /alerts`) done; can be stubbed with fake/empty data before then.
4. **`AlertFeed`, `AlertCard`, `SeverityFilterBar`** — needs Backend Day 15.
5. **`AlertDetailPanel`** — needs Backend Day 15's second endpoint, `GET /alerts/{id}`, same day.
6. **Confidence/needs-review styling on `AlertCard`** — needs Backend Day 17 (`confidence` handling) actually producing both values, so there's real data to style against.

This means real frontend work can start meaningfully by roughly the end of Backend Week 1, with the Alerts View following once Backend Week 3 begins — plan the frontend builder's own time around that gap rather than starting both on Day 1 and having half the app sit idle waiting on endpoints.
