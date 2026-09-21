# SafeCheck — Limitations

SafeCheck is a simulation-based cybersecurity system designed to demonstrate the detection of unsafe commands and abnormal behavior in an industrial control environment. It is intended for demonstration and experimentation, not for controlling a real industrial process.

## 1. Simulation Only

The Plant server simulates a simplified water tank, pump, and valve. Its physical behavior is an approximation and does not represent the full complexity of a real industrial control system.

## 2. Limited Physical Model

The water-level simulation uses simplified rules for how the pump and valve affect the tank. Real industrial systems may involve flow rates, pressure, sensor delays, equipment characteristics, and other physical variables that are not represented.

## 3. Limited Detection Scope

SafeCheck detects the specific unsafe or abnormal behaviors implemented for the project. It cannot guarantee detection of every possible attack against an industrial control system.

## 4. False Positives and False Negatives

Detection decisions are based on predefined rules and thresholds. As a result, unusual but legitimate behavior may sometimes be flagged, while sophisticated or previously unknown malicious behavior may not be detected.

## 5. Simulated Attack Environment

The attack scenarios are designed for the SafeCheck demonstration environment. Their behavior and results should not be interpreted as a complete representation of real-world industrial attacks.

## 6. Local Deployment

The project is primarily designed to run in a controlled local environment. Network delays, failures, or configurations found in larger distributed environments may produce different results.

## 7. Data Persistence

The project uses SQLite for storing readings, commands, and alerts. SQLite is suitable for this demonstration but may not be appropriate for a large-scale production monitoring system with many simultaneous users or devices.

## 8. Configuration Dependency

The Plant, Backend, Legit Client, Attack scripts, and Dashboard depend on shared configuration such as ports, register addresses, and API endpoints. Incorrect configuration can cause communication or detection problems.

## 9. No Production Safety Guarantee

SafeCheck should not be connected to real industrial equipment or used to make safety-critical decisions. It is an educational and research demonstration of context-aware command monitoring.

## Conclusion

These limitations define the intended scope of SafeCheck. The system demonstrates the concept of detecting commands that may appear valid at the protocol level but are unsafe or abnormal when considered in the context of the simulated plant state.
