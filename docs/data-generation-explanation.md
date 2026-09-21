# SafeCheck — Data Generation Explanation

## Overview

SafeCheck generates data by continuously monitoring a simulated industrial water tank through the Plant server. The Plant simulates the behavior of a pump, valve, and water level, while the Backend collects and stores the resulting readings and commands.

The system is designed to produce realistic normal-operation data as well as data representing potentially unsafe or abnormal behavior.

## Plant Data Generation

The Plant server maintains a `TankState` containing:

* Water level
* Pump state
* Valve state
* Danger state

The water level changes during each simulation tick according to the current pump and valve states.

* When the pump is ON and the valve is CLOSED, the water level increases.
* When the pump is OFF and the valve is OPEN, the water level decreases.
* When both the pump and valve are ON, their effects mostly offset each other.
* The water level is kept within the range of 0–100%.

The Plant runs these updates continuously at the configured tick interval.

## Modbus Registers

The Plant exposes its state through Modbus TCP registers.

### Holding Registers

Holding registers receive commands from clients:

* Register 0 — Pump command
* Register 1 — Valve command

A value of `1` means ON/open, while `0` means OFF/closed.

### Input Registers

Input registers provide the current Plant state:

* Register 0 — Water level
* Register 1 — Pump status
* Register 2 — Valve status

The register map is a shared contract between the Plant, Backend, Legit Client, and attack scripts.

## Backend Reading Generation

The Backend periodically connects to the Plant and reads the input registers.

Each polling cycle produces a `Reading` containing:

* Timestamp
* Water level
* Pump state
* Valve state
* Source

These readings are stored in the SQLite database. Continuous polling therefore creates a time series showing how the Plant changes over time.

## Command Data

Commands are generated when a client attempts to change the Plant state.

For example:

* Turning the pump ON
* Turning the pump OFF
* Opening the valve
* Closing the valve

The Legit Client generates commands representing normal operator behavior. Attack scripts generate commands representing abnormal or potentially unsafe behavior.

Each reported command contains its command type, requested value, and source identifier.

## Alert Data

The Backend Detector examines commands and readings to identify suspicious behavior.

Alerts may be generated when:

* A command is invalid or malformed.
* A command conflicts with the current Plant state.
* Plant readings appear to be suspiciously repeated.
* The Plant shows gradual abnormal drift over time.

Each alert contains a severity, confidence level, message, and, where applicable, a reference to the related command.

## Normal Operation Data

The Legit Client follows a repeating operator cycle designed to represent believable normal operation.

A typical cycle may:

1. Turn the pump ON.
2. Allow the tank level to increase.
3. Turn the pump OFF.
4. Open the valve.
5. Allow the tank level to decrease.
6. Close the valve.
7. Repeat.

This produces changing readings without intentionally creating a dangerous condition.

## Attack Data

The attack scripts intentionally produce abnormal command or reading patterns for testing the SafeCheck detection system.

The project includes scenarios such as:

* Unsafe command injection
* Replay behavior
* Commands issued at an inappropriate moment
* Slow or gradual drift
* Maintenance behavior used as a normal-operation comparison

The purpose of these scenarios is to provide controlled test data that allows the Detector to be evaluated against known situations.

## Why the Data Is Useful

The generated data allows the project to demonstrate the complete pipeline:

**Plant → Modbus → Backend → Database → Detector → Alerts → Dashboard**

Normal data establishes what expected operation looks like. Attack and abnormal data provides situations that the Detector should identify.

This separation makes it possible to compare normal and abnormal behavior and evaluate whether SafeCheck can identify unsafe commands without treating ordinary operation as an attack.

## Data Persistence

The Backend stores generated readings, commands, and alerts in SQLite.

The database is generated locally by the application and should not be committed to Git because it contains runtime data. A fresh database can be created automatically when the Backend is started.

## Important Limitation

SafeCheck is a simulation rather than a real industrial control system. The generated water-level behavior is intentionally simplified so that the project can demonstrate detection concepts in a controlled environment.

The generated data should therefore be interpreted as simulated experimental data, not measurements from a real water-treatment facility or industrial plant.
