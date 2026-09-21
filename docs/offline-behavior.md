# SafeCheck — Offline Behavior

This document describes how SafeCheck behaves when one or more components cannot communicate with the rest of the system.

## 1. Plant Server Offline

If the Plant server is not running, components that depend on it cannot obtain live plant data.

The Backend's Modbus client will be unable to read the Plant's registers. The Dashboard may therefore be unable to display current plant readings.

The Plant must be started before normal end-to-end operation can take place.

## 2. Backend Offline

If the Backend is unavailable, the Plant can continue running independently because the Plant does not depend on the Backend for its physical simulation.

The Legit Client can continue sending operator commands to the Plant. However, command-reporting requests to the Backend will fail while the Backend is unavailable.

A temporary Backend connection failure should not stop the Legit Client's local operator cycle.

## 3. Dashboard Offline

If the Dashboard is stopped or unavailable, the Plant and Backend can continue operating.

The Backend continues collecting Plant readings and processing commands and alerts. The Dashboard is only responsible for presenting information to the user.

## 4. Legit Client Offline

If the Legit Client is stopped, the Plant continues running according to its current state and simulation loop.

No normal operator commands will be generated until the Legit Client is started again.

## 5. Temporary Network Failure

A temporary communication failure between components should be treated as a connectivity problem rather than a Plant failure.

Components should log the failure where appropriate and attempt to continue operating when their function does not depend on the unavailable component.

## 6. Plant Restart

When the Plant server is restarted, the simulation starts from its configured initial state.

The expected default state is:

* Water level: 50%
* Pump: OFF
* Valve: CLOSED

The Plant then resumes its normal simulation and accepts new Modbus connections.

## 7. Data During Offline Periods

The Backend cannot create new `Reading` records from the Plant while it cannot communicate with the Plant.

Previously stored readings, commands, and alerts remain available in the SQLite database.

Once communication is restored, normal polling and data processing can resume.

## 8. Demonstration Consideration

Offline behavior is important during a live demonstration because individual components may occasionally be stopped, restarted, or temporarily unavailable.

The system should recover gracefully where possible rather than allowing a temporary failure in one component to crash the entire system.
