import React, { useState } from "react";
import { safecheckAPI } from "../../api/safecheck.api";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import { Zap, Play } from "lucide-react";

const SCENARIOS = [
	{
		id: "state_machine_violation",
		name: "Layer 2: State Machine Violation (High Water + Pump ON)",
		severity: "critical",
	},
	{
		id: "invalid_command",
		name: "Layer 1: Invalid / Malformed Command",
		severity: "warning",
	},
	{
		id: "replay_stuck",
		name: "Layer 3: Sensor Replay / Frozen Telemetry",
		severity: "warning",
	},
	{
		id: "drift_leak_rise",
		name: "Layer 4: Drift / Uncommanded Tank Rise",
		severity: "warning",
	},
	{
		id: "drift_pump_underperform",
		name: "Layer 4: Drift / Pump Underperformance",
		severity: "warning",
	},
	{
		id: "normal_operation",
		name: "Normal Operation (Safe Baseline)",
		severity: "info",
	},
	{
		id: "combined_replay_drift",
		name: "Layers 3 & 4: Concurrent Anomalies",
		severity: "warning",
	},
];

interface ScenarioRunnerProps {
	onScenarioRun?: () => void;
}

export const ScenarioRunner: React.FC<ScenarioRunnerProps> = ({
	onScenarioRun,
}) => {
	const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0].id);
	const [isRunning, setIsRunning] = useState(false);

	const handleRun = async () => {
		setIsRunning(true);
		try {
			const res = await safecheckAPI.simulateScenario(selectedScenario);
			const alertGenerated = res.result?.alert;
			if (alertGenerated) {
				toast.warning(
					`Alert caught [${alertGenerated.rule_triggered}]: ${alertGenerated.message.slice(0, 75)}...`,
					{ duration: 4500 },
				);
			} else {
				toast.success(
					"Scenario completed: 0 alerts (normal physical behavior verified)",
					{ duration: 3500 },
				);
			}
			onScenarioRun?.();
		} catch (err: any) {
			console.error("Failed to run scenario:", err);
			toast.error(
				err.response?.data?.detail || "Failed to trigger simulation scenario",
			);
		} finally {
			setIsRunning(false);
		}
	};

	const scenarioOptions = SCENARIOS.map((s) => ({
		value: s.id,
		label: s.name,
	}));

	return (
		<div className="bg-surface-1 text-text-primary rounded-2xl p-5 shadow-xs border border-border-subtle transition-colors">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<div className="flex items-center space-x-2">
						<span className="text-warning font-bold text-sm uppercase tracking-wider flex items-center gap-1.5">
							<Zap className="w-4 h-4 text-warning" />
							Demo Control Panel
						</span>
						<Badge variant="warning" size="sm" dot>
							Live Injection
						</Badge>
					</div>
					<p className="text-xs text-text-secondary mt-1">
						Trigger simulated attacks & anomalies directly against the detector
						engine to demonstrate active alerting.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
					<div className="w-full sm:w-80">
						<Select
							value={selectedScenario}
							onChange={(e) => setSelectedScenario(e.target.value)}
							options={scenarioOptions}
							disabled={isRunning}
						/>
					</div>

					<Button
						variant="danger"
						onClick={handleRun}
						isLoading={isRunning}
						leftIcon={<Play className="w-4 h-4" />}
						className="whitespace-nowrap"
					>
						{isRunning ? "Injecting..." : "Simulate"}
					</Button>
				</div>
			</div>
		</div>
	);
};
