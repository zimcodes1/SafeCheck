import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAlerts, useAlertDetail } from "../../hooks/useAlerts";
import type { AlertOut, Severity } from "../../types/safecheck.types";
import {
	AlertFeed,
	SeverityFilterBar,
	AlertDetailPanel,
} from "../../components/alerts";
import { Layout } from "../../components/layout/Layout";

export const AlertsView: React.FC = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const queryAlertId = searchParams.get("id")
		? Number(searchParams.get("id"))
		: null;

	const [selectedAlertId, setSelectedAlertId] = useState<number | null>(
		queryAlertId,
	);
	const [severityFilters, setSeverityFilters] = useState<Severity[]>([
		"info",
		"warning",
		"critical",
	]);

	// Alerts feed - polls every 5 seconds
	const { alerts, isLoading } = useAlerts({
		enabled: true,
		interval: 5000,
		severityFilters,
		limit: 100,
	});

	useEffect(() => {
		setSelectedAlertId(queryAlertId);
	}, [queryAlertId]);

	// Alert detail - fetches when an alert is selected
	const { alertDetail } = useAlertDetail(selectedAlertId);

	const handleFilterToggle = (severity: Severity) => {
		setSeverityFilters((prev) =>
			prev.includes(severity)
				? prev.filter((s) => s !== severity)
				: [...prev, severity],
		);
	};

	const handleAlertClick = (alert: AlertOut) => {
		setSelectedAlertId(alert.id);
		setSearchParams({ id: String(alert.id) });
	};

	const handleCloseDetail = () => {
		setSelectedAlertId(null);
		setSearchParams({});
	};

	return (
		<Layout>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
							Security Alerts
						</h1>
						<p className="text-sm text-text-secondary mt-1">
							Plain-language intrusion advisor showing detected anomalies and
							state-machine violations.
						</p>
					</div>
					<span className="text-xs bg-surface-2 text-text-secondary border border-border-subtle px-3 py-1 rounded-full font-mono">
						{alerts.length} alerts loaded
					</span>
				</div>

				{/* Severity Filter Bar */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-4 transition-colors">
					<SeverityFilterBar
						activeFilters={severityFilters}
						onFilterToggle={handleFilterToggle}
					/>
				</div>

				{/* Alert Feed */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 transition-colors">
					<AlertFeed
						alerts={alerts}
						isLoading={isLoading}
						onAlertClick={handleAlertClick}
					/>
				</div>

				{/* Alert Detail Panel */}
				<AlertDetailPanel
					isOpen={selectedAlertId !== null}
					alert={alertDetail}
					onClose={handleCloseDetail}
				/>
			</div>
		</Layout>
	);
};
