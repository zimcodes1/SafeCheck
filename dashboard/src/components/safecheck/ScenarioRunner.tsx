import React, { useState } from "react";
import { safecheckAPI } from "../../api/safecheck.api";
import { toast } from "react-hot-toast";

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
				toast.success(
					`Alert caught: [${alertGenerated.rule_triggered}] ${alertGenerated.message.slice(0, 60)}...`,
					{ duration: 4000 },
				);
			} else {
				toast.success(
					"Scenario completed: 0 alerts (normal behavior verified)",
					{ duration: 3000 },
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

	return (
		<div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<div className="flex items-center space-x-2">
						<span className="text-amber-400 font-bold text-sm uppercase tracking-wider">
							Demo Control Panel
						</span>
						<span className="bg-amber-400/20 text-amber-300 text-xs px-2 py-0.5 rounded font-mono">
							Live Injections
						</span>
					</div>
					<p className="text-xs text-slate-400 mt-1">
						Trigger simulated attacks & anomalies directly against the detector
						engine.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
					<select
						value={selectedScenario}
						onChange={(e) => setSelectedScenario(e.target.value)}
						disabled={isRunning}
						className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						{SCENARIOS.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</select>

					<button
						onClick={handleRun}
						disabled={isRunning}
						className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${
							isRunning
								? "bg-slate-700 text-slate-400 cursor-not-allowed"
								: "bg-red-600 hover:bg-red-500 text-white shadow-md hover:shadow-red-600/30"
						}`}
					>
						{isRunning ? (
							<>
								<svg
									className="animate-spin h-4 w-4 text-white"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8v8H4z"
									/>
								</svg>
								<span>Injecting...</span>
							</>
						) : (
							<>
								<span>Simulate</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
