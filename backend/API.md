# SafeCheck Backend — REST API Reference

This document provides a comprehensive specification of the SafeCheck Backend REST API, detailing endpoint paths, request parameters, data schemas, sample responses, and error behavior.

---

## Base URLs & Path Conventions

The backend server runs by default on `http://127.0.0.1:8000`.

To accommodate standard web client conventions and direct integration tests, **all routes are accessible both directly and under the `/api` prefix**:

- Root format: `http://127.0.0.1:8000/plant/live`
- Prefixed format: `http://127.0.0.1:8000/api/plant/live`

Both variants are identical in behavior and response payload.

---

## 1. System Health

### `GET /`

Basic service liveness check.

- **Headers**: None required
- **Parameters**: None
- **Response (200 OK)**:

```json
{
	"message": "Hello World!"
}
```

---

## 2. Live Plant Telemetry

### `GET /plant/live` (or `GET /api/plant/live`)

Fetches the instantaneous physical state directly from the Plant Modbus TCP server. This endpoint queries Modbus input registers (0–2) in real time and is **never** served from database cache.

- **Query Parameters**: None
- **Response (200 OK)**: `PlantLiveResponse`

```json
{
	"water_level": 50.0,
	"pump_state": false,
	"valve_state": false,
	"timestamp": "2026-09-03T07:44:09.123456"
}
```

- **Field Descriptions**:
  | Field | Type | Description |
  | :--- | :--- | :--- |
  | `water_level` | `float` | Current tank fill level percentage ($0.0 - 100.0\%$) |
  | `pump_state` | `boolean` | `true` if pump actuator is active/running; `false` if stopped |
  | `valve_state` | `boolean` | `true` if drainage valve is open; `false` if closed |
  | `timestamp` | `string (datetime)` | ISO timestamp of the instantaneous reading |

- **Error Responses**:
  - `500 Internal Server Error`: Returned if the plant Modbus server is offline or network communication times out.
  ```json
  {
  	"detail": "Could not connect to Plant at 127.0.0.1:5020"
  }
  ```

---

## 3. Command Reporting & In-Line Detection

### `POST /commands/report` (or `POST /api/commands/report`)

The central command reporting point for both legitimate operator clients and attack scripts.
Upon receiving a command, the backend:

1. Evaluates **Layer 1 (Sanity Check)** against command structure and types.
2. Fetches the current live physical plant state and evaluates **Layer 2 (State-Machine Validity)**.
3. Commits the record into the `commands` table with `flagged = true` if unsafe.
4. Generates an `Alert` in the database if violated.
5. Returns the saved command record along with the inline alert (if triggered).

- **Request Headers**: `Content-Type: application/json`
- **Request Body**: `CommandIn`

```json
{
	"command_type": "pump",
	"value": true,
	"source_id": "legit_operator"
}
```

- **Field Descriptions**:
  | Field | Type | Required | Values / Constraints |
  | :--- | :--- | :--- | :--- |
  | `command_type` | `string` | Yes | Must be `"pump"` or `"valve"` |
  | `value` | `boolean` | Yes | `true` (pump on / valve open), `false` (pump off / valve closed) |
  | `source_id` | `string` | Yes | Non-empty client identifier (e.g. `"legit_operator"`, `"attacker_ip"`) |

- **Response (200 OK — Normal / Safe Command)**:

```json
{
	"command": {
		"id": 12,
		"timestamp": "2026-09-03T06:44:09.650943Z",
		"command_type": "pump",
		"value": true,
		"source_id": "legit_operator",
		"flagged": false
	},
	"alert": null
}
```

- **Response (200 OK — Unsafe Command / State Machine Violation)**:

```json
{
	"command": {
		"id": 13,
		"timestamp": "2026-09-03T06:45:00.123456Z",
		"command_type": "pump",
		"value": true,
		"source_id": "attacker_wrong_moment",
		"flagged": true
	},
	"alert": {
		"id": 5,
		"timestamp": "2026-09-03T06:45:00.130000Z",
		"severity": "critical",
		"rule_triggered": "state_machine",
		"related_command_id": 13,
		"message": "Unsafe: pump is (or will remain) ON while the valve is CLOSED and the tank is already near full. This would force more water into a nearly-full tank.",
		"confidence": "certain"
	}
}
```

- **Error Responses**:
  - `422 Unprocessable Entity`: Request body violates Pydantic schema validation.
  - `500 Internal Server Error`: Database or execution error.

---

## 4. History Data

### `GET /history/readings` (or `GET /api/history/readings`)

Returns historical sensor readings logged by the background poller, sorted in descending order (most recent first).

- **Query Parameters**:
  | Parameter | Type | Default | Constraints | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `start` | `datetime` | `null` | ISO 8601 | Filter readings on or after this timestamp |
  | `end` | `datetime` | `now` | ISO 8601 | Filter readings on or before this timestamp |
  | `limit` | `integer` | `10` | $1 \le \text{limit} \le 100$ | Maximum number of rows to return |
  | `offset` | `integer` | `0` | $\ge 0$ | Pagination offset |

- **Response (200 OK)**: `List[ReadingOut]`

```json
[
	{
		"id": 12950,
		"timestamp": "2026-09-03T06:47:24Z",
		"water_level": 50.0,
		"pump_state": false,
		"valve_state": false,
		"source": "plant"
	},
	{
		"id": 12949,
		"timestamp": "2026-09-03T06:47:23Z",
		"water_level": 50.0,
		"pump_state": false,
		"valve_state": false,
		"source": "plant"
	}
]
```

---

### `GET /history/commands` (or `GET /api/history/commands`)

Returns historical operator and attacker commands recorded by the backend.

- **Query Parameters**:
  | Parameter | Type | Default | Constraints | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `start` | `datetime` | `null` | ISO 8601 | Filter commands on or after this timestamp |
  | `end` | `datetime` | `now` | ISO 8601 | Filter commands on or before this timestamp |
  | `limit` | `integer` | `10` | $1 \le \text{limit} \le 100$ | Maximum number of rows to return |
  | `offset` | `integer` | `0` | $\ge 0$ | Pagination offset |

- **Response (200 OK)**: `List[CommandOut]`

```json
[
	{
		"id": 32,
		"timestamp": "2026-09-03T06:47:24Z",
		"command_type": "valve",
		"value": false,
		"source_id": "legit_operator",
		"flagged": false
	},
	{
		"id": 31,
		"timestamp": "2026-09-03T06:47:18Z",
		"command_type": "pump",
		"value": true,
		"source_id": "attacker_state_machine",
		"flagged": true
	}
]
```

---

## 5. Security Alerts

### `GET /alerts` (or `GET /api/alerts`)

Queries the intrusion detector alert feed. Alerts are ordered reverse-chronologically (newest first).

- **Query Parameters**:
  | Parameter | Type | Default | Constraints | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `severity` | `string` | `null` | `"info"`, `"warning"`, `"critical"` | Filter alerts by exact severity level |
  | `limit` | `integer` | `10` | $1 \le \text{limit} \le 100$ | Maximum alerts to return |

- **Response (200 OK)**: `List[AlertOut]`

```json
[
	{
		"id": 46,
		"timestamp": "2026-09-03T06:47:23.850000Z",
		"severity": "warning",
		"rule_triggered": "drift",
		"related_command_id": null,
		"message": "Slow rise detected while pump is mostly OFF: level increased 7.00 over 300s (rate 0.0233/s). Possible leak, sensor bias, or background inflow.",
		"confidence": "needs_review"
	},
	{
		"id": 45,
		"timestamp": "2026-09-03T06:47:21.500000Z",
		"severity": "warning",
		"rule_triggered": "replay",
		"related_command_id": null,
		"message": "Sensor anomaly: pump has been active but water level changed only 0.00 over 4 samples. Possible sensor replay, transmission failure, or device hang — investigate sensors and connectivity.",
		"confidence": "needs_review"
	},
	{
		"id": 44,
		"timestamp": "2026-09-03T06:47:18.200000Z",
		"severity": "critical",
		"rule_triggered": "state_machine",
		"related_command_id": 31,
		"message": "Unsafe: pump is (or will remain) ON while the valve is CLOSED and the tank is already near full. This would force more water into a nearly-full tank.",
		"confidence": "certain"
	}
]
```

- **Field Descriptions**:
  | Field | Type | Description |
  | :--- | :--- | :--- |
  | `id` | `integer` | Unique alert primary key |
  | `timestamp` | `string (datetime)` | Timestamp when the alert was triggered |
  | `severity` | `string` | `"info"`, `"warning"`, or `"critical"` |
  | `rule_triggered` | `string` | Detection layer: `"sanity_check"`, `"state_machine"`, `"replay"`, or `"drift"` |
  | `related_command_id` | `integer \| null` | Foreign key to `commands.id` if triggered by a command (null for reading anomalies) |
  | `message` | `string` | Plain-language advisory explanation for human operators |
  | `confidence` | `string` | `"certain"` (deterministic rules) or `"needs_review"` (empirical drift/replay) |

---

### `GET /alerts/{alert_id}` (or `GET /api/alerts/{alert_id}`)

Fetches detailed information for a single alert. If the alert was caused by a specific command, includes the full `related_command` object.

- **Path Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `alert_id` | `integer` | Yes | Primary key ID of the alert |

- **Response (200 OK — Alert tied to a Command)**: `AlertDetail`

```json
{
	"id": 44,
	"timestamp": "2026-09-03T06:47:18.200000Z",
	"severity": "critical",
	"rule_triggered": "state_machine",
	"related_command_id": 31,
	"message": "Unsafe: pump is (or will remain) ON while the valve is CLOSED and the tank is already near full. This would force more water into a nearly-full tank.",
	"confidence": "certain",
	"related_command": {
		"id": 31,
		"timestamp": "2026-09-03T06:47:18.150000Z",
		"command_type": "pump",
		"value": true,
		"source_id": "attacker_state_machine",
		"flagged": true
	}
}
```

- **Response (200 OK — Telemetry-based Alert without Command)**:

```json
{
	"id": 46,
	"timestamp": "2026-09-03T06:47:23.850000Z",
	"severity": "warning",
	"rule_triggered": "drift",
	"related_command_id": null,
	"message": "Slow rise detected while pump is mostly OFF: level increased 7.00 over 300s (rate 0.0233/s). Possible leak, sensor bias, or background inflow.",
	"confidence": "needs_review",
	"related_command": null
}
```

- **Error Responses**:
  - `404 Not Found`: Alert ID does not exist.
  ```json
  {
  	"detail": "Alert not found"
  }
  ```

---

## 6. Simulation & Demo Scenarios

### `POST /simulate/scenario` (or `POST /api/simulate/scenario`)

Triggers an automated simulation scenario. Designed for automated testing, test suites, and live competition demonstrations.

- **Request Body**:

```json
{
	"scenario_name": "state_machine_violation"
}
```

- **Supported Scenario Names**:
  | Scenario Name | Layer Exercised | Expected Outcome |
  | :--- | :--- | :--- |
  | `"normal_operation"` | Baseline | Normal telemetry window; **0 alerts** |
  | `"state_machine_violation"` | Layer 2 | High water + pump ON; **CRITICAL State Machine alert** |
  | `"invalid_command"` | Layer 1 | Malformed parameter type; **WARNING Sanity Check alert** |
  | `"replay_stuck"` | Layer 3 | Identical readings during pump active; **WARNING Replay alert** |
  | `"drift_leak_rise"` | Layer 4 | Gradual uncommanded rise; **WARNING Drift alert** |
  | `"drift_pump_underperform"`| Layer 4 | Pump on but insufficient rise; **WARNING Drift alert** |
  | `"insufficient_samples"` | Window Guard | Short window ($<3$ samples); **0 alerts** |
  | `"combined_replay_drift"` | Layers 3 & 4 | Concurrent anomalies; **WARNING Replay alert** |

- **Response (200 OK)**:

```json
{
	"ok": true,
	"result": {
		"scenario": "state_machine_violation",
		"command": {
			"id": 35,
			"command_type": "pump",
			"value": true,
			"source_id": "sim",
			"flagged": true
		},
		"alert": {
			"id": 48,
			"severity": "critical",
			"rule_triggered": "state_machine",
			"related_command_id": 35,
			"message": "Unsafe: pump is (or will remain) ON while the valve is CLOSED and the tank is already near full. This would force more water into a nearly-full tank.",
			"confidence": "certain"
		}
	}
}
```

- **Error Responses**:
  - `404 Not Found`: Scenario name is unknown.
  ```json
  {
  	"detail": "Unknown scenario: invalid_name"
  }
  ```
