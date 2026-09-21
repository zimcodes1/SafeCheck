# SafeCheck — Demo Script

## 1. Purpose

This script provides a step-by-step sequence for demonstrating SafeCheck from normal operation through the detection of unsafe and abnormal commands.

The demonstration should be performed in the following order:

**Plant → Backend → Dashboard → Legit Client → Attack scenarios**

---

## 2. Before the Demo

Confirm that:

* The SafeCheck repository is available locally.
* Python dependencies are installed for the required components.
* The Plant server is configured to use port `5020`.
* The Backend is configured to use port `8000`.
* The Dashboard is configured to use port `5173`.
* The Plant, Backend, and Dashboard can communicate with each other.
* The database is available for the Backend to store readings, commands, and alerts.

---

## 3. Start the Plant

Start the Plant server first.

The Plant provides the simulated industrial environment containing:

* Water tank
* Pump
* Valve
* Water-level simulation
* Modbus TCP interface

Confirm that the Plant starts successfully and listens on port `5020`.

The initial state should be approximately:

* Water level: 50%
* Pump: OFF
* Valve: CLOSED

---

## 4. Start the Backend

Start the Backend after the Plant is running.

The Backend connects to the Plant through Modbus TCP and continuously collects Plant readings.

Confirm that the Backend starts successfully on port `8000`.

Check the live Plant endpoint:

`GET /plant/live`

The response should contain the current:

* Water level
* Pump state
* Valve state

---

## 5. Start the Dashboard

Start the Dashboard and open it in a web browser.

Confirm that it can communicate with the Backend and display the current Plant information.

The Dashboard should provide access to live Plant information and detected alerts.

---

## 6. Start the Legitimate Operator

Start the Legit Client.

The Legit Client simulates normal operator behavior by sending valid commands to the Plant, such as:

1. Pump ON
2. Wait
3. Pump OFF
4. Valve OPEN
5. Wait
6. Valve CLOSED
7. Repeat

During normal operation, the water level should rise and fall in a sensible way without repeatedly entering a dangerous condition.

The Backend should receive reports of legitimate commands using the source identifier:

`legit_operator`

---

## 7. Demonstrate Normal Operation

Allow the system to run normally for a short period.

Observe:

* Changing water level
* Pump status
* Valve status
* Commands reported by the Legit Client
* Readings stored by the Backend
* Dashboard updates

This establishes the normal baseline before demonstrating abnormal behavior.

---

## 8. Demonstrate Attack Detection

Run each available attack scenario individually.

After starting an attack, observe the Plant, Backend, and Dashboard.

The expected workflow is:

**Attack command → Plant state/command → Backend detection → Alert → Dashboard**

Allow enough time for the Backend to process the command or readings before starting the next scenario.

---

## 9. Review Alerts

Open the Dashboard's alert view or query the Backend's alert endpoint.

Confirm that detected events contain useful information such as:

* Alert severity
* Plain-language explanation
* Time of detection
* Related command when applicable
* Detection confidence when available

The purpose is to demonstrate that SafeCheck does not only identify that something happened, but explains why the behavior was considered suspicious or unsafe.

---

## 10. Demonstrate Maintenance / Normal Scenario

Run the maintenance scenario after the attack demonstrations.

The maintenance scenario represents an unusual but legitimate operation.

The expected result is that the system does not incorrectly treat legitimate maintenance behavior as an attack.

This demonstrates the importance of considering Plant context rather than flagging every unusual command.

---

## 11. Final Verification

At the end of the demonstration, verify that:

* The Plant is still running.
* The Backend is still collecting readings.
* The Dashboard is still communicating with the Backend.
* Commands are recorded correctly.
* Expected attacks generated alerts.
* Normal and maintenance behavior did not produce inappropriate alerts.
* No component crashed during the demonstration.

---

## 12. Recommended Demonstration Order

For a clear presentation, use this sequence:

1. Introduce SafeCheck and its purpose.
2. Show the simulated Plant.
3. Show normal operation.
4. Show live readings in the Dashboard.
5. Trigger an unsafe command.
6. Show the resulting alert.
7. Demonstrate the remaining attack scenarios.
8. Demonstrate the maintenance scenario.
9. Show the stored command, reading, and alert history.
10. Explain how SafeCheck distinguishes normal behavior from suspicious behavior.
11. Mention the system's limitations.

---

## 13. Important Demo Rule

Run attack scenarios one at a time and allow the system enough time to process the resulting commands and readings.

Do not assume that an alert has been generated simply because an attack script has started. Confirm the result through the Backend or Dashboard.

The demonstration should focus on observable evidence: Plant behavior, recorded commands, recorded readings, and generated alerts.
