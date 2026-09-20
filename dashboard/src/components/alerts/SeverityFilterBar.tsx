import React from "react";
import type { Severity } from "../../types/safecheck.types";
import { AlertOctagon, AlertTriangle, Info, ShieldAlert } from "lucide-react";

export type SeverityTab = "all" | Severity;

interface SeverityFilterBarProps {
	activeTab: SeverityTab;
	onTabChange: (tab: SeverityTab) => void;
	counts?: {
		all: number;
		critical: number;
		warning: number;
		info: number;
	};
}

export const SeverityFilterBar: React.FC<SeverityFilterBarProps> = ({
	activeTab,
	onTabChange,
	counts = { all: 0, critical: 0, warning: 0, info: 0 },
}) => {
	const tabs: {
		id: SeverityTab;
		label: string;
		icon: React.ReactNode;
		badgeClass: string;
		activeClass: string;
	}[] = [
		{
			id: "all",
			label: "All Alerts",
			icon: <ShieldAlert className="w-4 h-4" />,
			badgeClass: "bg-surface-2 text-text-secondary border-border-subtle",
			activeClass: "border-primary text-primary font-bold",
		},
		{
			id: "critical",
			label: "Critical",
			icon: <AlertOctagon className="w-4 h-4 text-critical" />,
			badgeClass:
				"bg-critical/15 text-critical border-critical/30 font-semibold",
			activeClass: "border-critical text-critical font-bold",
		},
		{
			id: "warning",
			label: "Warning",
			icon: <AlertTriangle className="w-4 h-4 text-warning" />,
			badgeClass: "bg-warning/15 text-warning border-warning/30 font-semibold",
			activeClass: "border-warning text-warning font-bold",
		},
		{
			id: "info",
			label: "Info",
			icon: <Info className="w-4 h-4 text-info" />,
			badgeClass: "bg-info/15 text-info border-info/30 font-semibold",
			activeClass: "border-info text-info font-bold",
		},
	];

	return (
		<div className="flex items-center gap-1 sm:gap-2 border-b border-border-subtle">
			{tabs.map((tab) => {
				const isActive = activeTab === tab.id;
				const count = counts[tab.id];

				return (
					<button
						key={tab.id}
						onClick={() => onTabChange(tab.id)}
						className={`flex items-center gap-2 px-3.5 py-3 text-sm font-medium border-b-2 cursor-pointer transition-all whitespace-nowrap -mb-px ${
							isActive
								? `${tab.activeClass} bg-surface-2/40`
								: "border-transparent text-text-secondary hover:text-text-primary hover:border-border-subtle/80"
						}`}
					>
						<span className="shrink-0">{tab.icon}</span>
						<span>{tab.label}</span>
						<span
							className={`text-xs px-2 py-0.5 rounded-full border font-mono transition-colors ${
								isActive
									? tab.badgeClass
									: "bg-surface-2 text-text-tertiary border-border-subtle"
							}`}
						>
							{count}
						</span>
					</button>
				);
			})}
		</div>
	);
};
