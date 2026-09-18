import React from "react";
import type { Severity } from "../../types/safecheck.types";
import { AlertOctagon, AlertTriangle, Info, Check, Filter } from "lucide-react";

interface SeverityFilterBarProps {
	activeFilters: Severity[];
	onFilterToggle: (severity: Severity) => void;
}

export const SeverityFilterBar: React.FC<SeverityFilterBarProps> = ({
	activeFilters,
	onFilterToggle,
}) => {
	const isAllActive =
		activeFilters.includes("critical") &&
		activeFilters.includes("warning") &&
		activeFilters.includes("info");

	const handleSelectAll = () => {
		if (isAllActive) {
			// Leave at least critical active
			if (activeFilters.includes("critical")) onFilterToggle("warning");
		} else {
			if (!activeFilters.includes("critical")) onFilterToggle("critical");
			if (!activeFilters.includes("warning")) onFilterToggle("warning");
			if (!activeFilters.includes("info")) onFilterToggle("info");
		}
	};

	const filterConfigs: {
		severity: Severity;
		label: string;
		icon: React.ReactNode;
		activeClasses: string;
		inactiveClasses: string;
	}[] = [
		{
			severity: "critical",
			label: "Critical",
			icon: <AlertOctagon className="w-4 h-4" />,
			activeClasses:
				"bg-critical text-white shadow-xs font-semibold border-critical",
			inactiveClasses:
				"bg-surface-1 text-critical/80 border-border-subtle hover:bg-critical/10 hover:border-critical/30",
		},
		{
			severity: "warning",
			label: "Warning",
			icon: <AlertTriangle className="w-4 h-4" />,
			activeClasses:
				"bg-warning text-white shadow-xs font-semibold border-warning",
			inactiveClasses:
				"bg-surface-1 text-warning/80 border-border-subtle hover:bg-warning/10 hover:border-warning/30",
		},
		{
			severity: "info",
			label: "Info",
			icon: <Info className="w-4 h-4" />,
			activeClasses: "bg-info text-white shadow-xs font-semibold border-info",
			inactiveClasses:
				"bg-surface-1 text-info/80 border-border-subtle hover:bg-info/10 hover:border-info/30",
		},
	];

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
				<Filter className="w-3.5 h-3.5 text-primary" />
				<span>Severity Filters:</span>
			</div>

			<div className="flex flex-wrap items-center gap-2 p-1.5 bg-surface-2 rounded-xl border border-border-subtle">
				{/* Toggle All Button */}
				<button
					onClick={handleSelectAll}
					className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
						isAllActive
							? "bg-surface-1 text-primary border border-border-subtle shadow-2xs font-semibold"
							: "text-text-secondary hover:text-text-primary hover:bg-surface-1/60 border border-transparent"
					}`}
				>
					{isAllActive && <Check className="w-3 h-3 text-primary" />}
					<span>All Severities</span>
				</button>

				<div className="w-px h-5 bg-border-subtle mx-0.5 hidden sm:block" />

				{/* Severity Toggles */}
				{filterConfigs.map(
					({ severity, label, icon, activeClasses, inactiveClasses }) => {
						const isActive = activeFilters.includes(severity);
						return (
							<button
								key={severity}
								onClick={() => onFilterToggle(severity)}
								className={`px-3.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-150 flex items-center gap-1.5 border ${
									isActive ? activeClasses : inactiveClasses
								}`}
							>
								<span className="shrink-0">{icon}</span>
								<span>{label}</span>
								{isActive && (
									<span className="w-1.5 h-1.5 rounded-full bg-white/90 shrink-0 ml-0.5" />
								)}
							</button>
						);
					},
				)}
			</div>
		</div>
	);
};
