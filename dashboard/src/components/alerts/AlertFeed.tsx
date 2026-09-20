import React from "react";
import type { AlertOut } from "../../types/safecheck.types";
import { AlertCard } from "./AlertCard";
import { Spinner } from "../ui/Spinner";
import { ShieldCheck } from "lucide-react";

interface AlertFeedProps {
	alerts: AlertOut[];
	isLoading: boolean;
	selectedAlertIds?: Set<number>;
	onToggleSelect?: (alertId: number) => void;
	onAlertClick: (alert: AlertOut) => void;
	onDeleteAlert?: (alertId: number) => void;
	onMarkReadAlert?: (alertId: number) => void;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({
	alerts,
	isLoading,
	selectedAlertIds = new Set(),
	onToggleSelect,
	onAlertClick,
	onDeleteAlert,
	onMarkReadAlert,
}) => {
	if (isLoading && alerts.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
				<Spinner size="lg" label="Listening for detector stream..." />
			</div>
		);
	}

	if (alerts.length === 0) {
		return (
			<div className="text-center py-16 px-4">
				<div className="w-14 h-14 rounded-2xl bg-success/10 border border-success/20 text-success mx-auto flex items-center justify-center mb-3.5 shadow-2xs">
					<ShieldCheck className="w-8 h-8" />
				</div>
				<h3 className="text-base font-semibold text-text-primary">
					No Alerts Detected
				</h3>
				<p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
					The physical water plant is operating within safe, expected
					parameters. All command and telemetry checks have passed.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{alerts.map((alert) => (
				<AlertCard
					key={alert.id}
					alert={alert}
					isSelected={selectedAlertIds.has(alert.id)}
					onToggleSelect={
						onToggleSelect ? () => onToggleSelect(alert.id) : undefined
					}
					onClick={() => onAlertClick(alert)}
					onDelete={onDeleteAlert ? () => onDeleteAlert(alert.id) : undefined}
					onMarkRead={
						onMarkReadAlert ? () => onMarkReadAlert(alert.id) : undefined
					}
				/>
			))}
		</div>
	);
};
