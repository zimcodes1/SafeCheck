# SafeCheck — Frontend Pages & Components Guide

This document describes the design, structure, components, and exact Backend endpoint integration for the SafeCheck Dashboard (React + TypeScript + Vite).

---

## 1. Critical Architectural Role: Passive Viewership & Advisory Alerting

> [!IMPORTANT]
> **What the Dashboard IS and IS NOT:**
> - **The Dashboard IS**: A **strictly passive monitoring, viewership, and advisory alerting display**. It is an engineer's window into the live physical state of the plant and an early warning feed that explains detected anomalies in plain language.
> - **The Dashboard IS NOT**: An orchestrator, controller, or supervisory client. It **never** issues commands to the plant, sends Modbus packets, starts or stops pumps, or autonomously blocks traffic. 
> 
> In industrial control systems (ICS) and critical infrastructure, automatic blocking by an external tool can cause catastrophic physical trips. SafeCheck adheres strictly to the rule that **the human engineer decides, not the system**. Legitimate operator traffic and attack vectors are executed by external standalone clients; the Dashboard only reads, visualizes, and alerts.

---

## 2. Completed Backend Integration & Base URLs

The backend is **100% implemented and verified through Day 21** (including SQLite history, 4-layer detector engine, poller loop, and full integration tests).

- **Default Backend Origin**: `http://127.0.0.1:8000`
- **Dual Path Support**: All endpoints are mounted at both the root path and under the `/api` prefix (e.g., `/plant/live` and `/api/plant/live` behave identically). Use either standard consistently in the frontend API service.
- **CORS / Dev Proxy**: Configure `vite.config.ts` to proxy `/api` or `/plant`, `/alerts`, etc. to `http://127.0.0.1:8000` during local development.

---

## 3. Application Structure

The dashboard is designed as a focused single-page application (SPA) with two primary views switched via a top navigation bar:

```text
App
├── Shell (Top Navigation & Health Bar — Always Visible)
│   ├── ConnectionStatusBadge    [Points to GET /plant/live]
│   └── TabBar                   [Local UI state: "Live View" vs "Alerts"]
│
├── Live View                    (Default Primary Tab)
│   ├── TankGauge                [Points to GET /plant/live -> water_level]
│   ├── PumpStatusLight          [Points to GET /plant/live -> pump_state]
│   ├── ValveStatusLight         [Points to GET /plant/live -> valve_state]
│   └── RecentAlertsStrip        [Points to GET /alerts?limit=5]
│
└── Alerts View                  (Audit & Investigation Tab)
    ├── SeverityFilterBar        [Points to GET /alerts?severity=...]
    ├── AlertFeed                [Points to GET /alerts]
    │   └── AlertCard (repeated) [Renders AlertOut shape]
    └── AlertDetailModal/Panel   [Points to GET /alerts/{id} -> AlertDetail]
```

---

## 4. TypeScript Contracts & Interfaces

These interfaces mirror the backend's Pydantic schemas ([backend/app/schemas/](file:///home/azimeh/Desktop/Code/SafeCheck/backend/app/schemas/)):

```typescript
// Shared Types & Enums
export type SeverityLevel = 'info' | 'warning' | 'critical';
export type DetectorRule = 'sanity_check' | 'state_machine' | 'replay' | 'drift';
export type ConfidenceLevel = 'certain' | 'needs_review';
export type CommandType = 'pump' | 'valve';

// Telemetry: GET /plant/live
export interface PlantLiveResponse {
  water_level: number;      // 0.0 - 100.0%
  pump_state: boolean;       // true = active/running, false = off
  valve_state: boolean;      // true = open, false = closed
  timestamp: string;         // ISO 8601 datetime
}

// Alert Feed Summary: GET /alerts
export interface AlertOut {
  id: number;
  timestamp: string;         // ISO 8601 datetime
  severity: SeverityLevel;
  rule_triggered: DetectorRule;
  related_command_id: number | null;
  message: string;           // Plain-language explanation for engineers
  confidence: ConfidenceLevel;
}

// Command Details: Embedded inside AlertDetail
export interface CommandOut {
  id: number;
  timestamp: string;
  command_type: CommandType;
  value: boolean;
  source_id: string;         // e.g. "legit_operator", "attacker_ip"
  flagged: boolean;          // true if flagged by detector
}

// Expanded Alert Detail: GET /alerts/{id}
export interface AlertDetail extends AlertOut {
  related_command: CommandOut | null;
}

// Historical Reading: GET /history/readings
export interface ReadingOut {
  id: number;
  timestamp: string;
  water_level: number;
  pump_state: boolean;
  valve_state: boolean;
  source: string;
}
```

---

## 5. Shell Components (Always Visible)

### `ConnectionStatusBadge`
- **Purpose**: Informs judges and operators whether the dashboard has live connectivity to the backend and physical plant simulator.
- **Endpoint**: `GET /plant/live` (or `GET /`)
- **Polling Cadence**: Evaluated on every Live View poll (every ~1.0s).
- **Behavior**:
  - **Connected (Green)**: HTTP 200 returned within timeout ($\le 2.0\text{s}$). Label: `ONLINE / POLLING`.
  - **Disconnected (Red)**: Network failure or HTTP 500. Label: `PLANT OFFLINE`.
- **Why it matters**: If the Modbus plant or backend goes down during a demo, this alerts you immediately rather than presenting frozen data without explanation.

### `TabBar`
- **Purpose**: Switches between the two core screens: **"Live System"** and **"Security Alerts"**.
- **Endpoint**: None (pure client-side UI state).

---

## 6. Live View Components

**Screen Objective**: Allows judges and engineers to immediately understand what the physical plant is doing within 2 seconds of looking at the screen.

### `TankGauge`
- **Endpoint**: `GET /plant/live`
- **Field Consumed**: `data.water_level` ($0.0 - 100.0\%$).
- **Polling Cadence**: Every 1.0 second.
- **Visualization**:
  - A vertical cylinder/tank graphic or linear fill gauge representing tank volume from bottom (0%) to top (100%).
  - Numeric percentage displayed clearly alongside (e.g., `78.4%`).
- **Dynamic State Thresholds**:
  - **Normal Operation ($10.0\% - 85.0\%$)**: Neutral industrial blue (`#3b82f6`).
  - **Elevated Level ($85.0\% - 94.9\%$)**: Warning amber (`#f59e0b`).
  - **Critical Danger Threshold ($\ge 95.0\%$)**: Alert red (`#ef4444`) with subtle pulse animation, aligning with Detector Layer 2's high-water threshold.

### `PumpStatusLight` & `ValveStatusLight`
- **Endpoint**: `GET /plant/live`
- **Fields Consumed**: `data.pump_state` (bool), `data.valve_state` (bool).
- **Polling Cadence**: Every 1.0 second (shared payload from `GET /plant/live`).
- **Visualization**:
  - Industrial LED panel indicators clearly labeled **"PUMP"** and **"VALVE"**.
  - **Pump Active (`true`)**: Vibrant Green indicator (`#22c55e`) with label `RUNNING / INFLOW`.
  - **Pump Stopped (`false`)**: Muted Slate/Grey (`#64748b`) with label `STOPPED`.
  - **Valve Open (`true`)**: Vibrant Green indicator (`#22c55e`) with label `OPEN / DRAINING`.
  - **Valve Closed (`false`)**: Muted Slate/Grey (`#64748b`) with label `CLOSED`.
- **Note**: Keep actuator indicator colors separate from danger/alert colors. Green represents an energized physical actuator, not "safe" vs "unsafe".

### `RecentAlertsStrip`
- **Endpoint**: `GET /alerts?limit=4`
- **Polling Cadence**: Every 3.0 to 5.0 seconds.
- **Purpose**: Displays the 3–4 most recent security detections directly under the tank gauge so judges immediately see the causality between physical actions and detector alerts without navigating away.
- **Interaction**: Clicking any item in the strip opens the Alerts View and pre-selects that specific alert.

---

## 7. Alerts View Components

**Screen Objective**: The core evidentiary screen for competition judges. Proves detection accuracy, demonstrates contextual reasoning, shows confidence ratings, and provides full command attribution.

### `SeverityFilterBar`
- **Endpoint**: `GET /alerts?severity={severity}`
- **Parameters**:
  - All: `GET /alerts` (no query filter)
  - Critical only: `GET /alerts?severity=critical`
  - Warning only: `GET /alerts?severity=warning`
  - Info only: `GET /alerts?severity=info`
- **Interaction**: Quick toggle buttons with badge counts.

### `AlertFeed`
- **Endpoint**: `GET /alerts`
- **Query Parameters**: `limit=50`, optional `severity`.
- **Polling Cadence**: Every 3.0 to 5.0 seconds (and refreshed immediately when filter changes).
- **Behavior**: Reverse-chronological scrollable list of `AlertCard` components.

### `AlertCard`
- **Data Shape**: Rendered from `AlertOut`.
- **Elements Displayed**:
  1. **Severity Badge**: Color-coded pill (`CRITICAL`, `WARNING`, `INFO`).
  2. **Plain-Language Message**: Clean text without raw cryptic codes (e.g., *"Unsafe: pump is ON while valve is CLOSED and tank is near full."*).
  3. **Layer Badge**: Shows `rule_triggered` in a subtle tag (`state_machine`, `sanity_check`, `replay`, `drift`) explaining *why* it was caught.
  4. **Confidence Badge**:
     - `"certain"`: Solid badge styling (indicates deterministic logic failure).
     - `"needs_review"`: Distinct amber/dashed border badge (visually answers the brief's requirement for handling empirical uncertainty).
  5. **Relative Timestamp**: e.g., `"4s ago"`, `"2m ago"`.
- **Interaction**: Clicking anywhere on the card triggers the detail modal/panel.

### `AlertDetailPanel` (Modal or Slide-over Drawer)
- **Endpoint**: `GET /alerts/{id}`
- **Trigger**: Clicked from `AlertCard` or `RecentAlertsStrip`.
- **Behavior**:
  - Fetches the full `AlertDetail` object.
  - Displays full alert metadata, message, and timestamp.
  - **Related Command Section** (when `related_command` is present):
    - Command Type: `pump` / `valve`
    - Value Sent: `ON` / `OFF` / `OPEN` / `CLOSED`
    - Self-Declared Identity Tag: `source_id` (e.g., `"attacker_wrong_moment"`, `"legit_operator"`)
    - Flagged by System: `true` / `false`
- **Why it matters**: Demonstrates the full investigation trail to judges: *Here is the command that was sent, here is who sent it, here is the physical state of the tank, and here is why SafeCheck flagged it.*

---

## 8. Visual & Style Design System

Maintain consistent visual tokens across all components:

| Category | Value | Hex / Tailwind | Used By |
| :--- | :--- | :--- | :--- |
| **Critical Severity** | Red | `#ef4444` (`red-500`) | Critical Alerts, Tank Gauge $\ge 95\%$ |
| **Warning Severity** | Amber | `#f59e0b` (`amber-500`) | Warning Alerts, Tank Gauge $85-95\%$, `needs_review` |
| **Info Severity** | Slate | `#64748b` (`slate-500`) | Informational alerts, system logs |
| **Normal Liquid** | Blue | `#3b82f6` (`blue-500`) | Tank Gauge normal fill level ($10-85\%$) |
| **Actuator Active** | Green | `#22c55e` (`green-500`) | Pump Running, Valve Open |
| **Actuator Idle** | Slate Grey | `#94a3b8` (`slate-400`) | Pump Stopped, Valve Closed |

---

## 9. API Integration Hook Example (React + Axios / Fetch)

```typescript
// src/services/api.ts
import axios from 'axios';
import { PlantLiveResponse, AlertOut, AlertDetail } from '../types';

const API_BASE = '/api'; // Proxied to http://127.0.0.1:8000 in vite.config.ts

export const fetchPlantLive = async (): Promise<PlantLiveResponse> => {
  const res = await axios.get<PlantLiveResponse>(`${API_BASE}/plant/live`);
  return res.data;
};

export const fetchAlerts = async (severity?: string, limit: number = 20): Promise<AlertOut[]> => {
  const params: Record<string, any> = { limit };
  if (severity) params.severity = severity;
  const res = await axios.get<AlertOut[]>(`${API_BASE}/alerts`, { params });
  return res.data;
};

export const fetchAlertDetail = async (id: number): Promise<AlertDetail> => {
  const res = await axios.get<AlertDetail>(`${API_BASE}/alerts/${id}`);
  return res.data;
};
```

---

## 10. Summary Checklist for the Frontend Developer

- [ ] Configure Vite dev proxy to point to `http://127.0.0.1:8000`.
- [ ] Build **Shell** (`ConnectionStatusBadge` and `TabBar`).
- [ ] Build **Live View** (`TankGauge`, `PumpStatusLight`, `ValveStatusLight`, `RecentAlertsStrip`) connected to `GET /plant/live` and `GET /alerts?limit=5`.
- [ ] Build **Alerts View** (`SeverityFilterBar`, `AlertFeed`, `AlertCard`) connected to `GET /alerts`.
- [ ] Build **AlertDetailPanel** connected to `GET /alerts/{id}`.
- [ ] Ensure **NO control buttons** (e.g. "turn pump on") exist in the UI — the dashboard is strictly a monitoring & alerting tool.
- [ ] Verify relative time updates and automatic background polling intervals.
