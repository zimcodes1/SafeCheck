import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAlerts, useAlertDetail } from "../../hooks/useAlerts";
import type { AlertOut, Severity } from "../../types/safecheck.types";
import {
	AlertFeed,
	SeverityFilterBar,
	AlertDetailPanel,
} from "../../components/alerts";
import { Layout } from "../../components/layout/Layout";
import { Button, Badge } from "../../components/ui";
import { useAlertStore } from "../../store/alertStore";
import { parseUtcDate } from "../../utils/timeUtils";
import {
	Clock,
	ChevronLeft,
	ChevronRight,
	CheckCheck,
	Calendar,
	Filter,
} from "lucide-react";

type TimeRangePreset = "all" | "15m" | "1h" | "24h" | "custom";

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

	// Time filters
	const [timePreset, setTimePreset] = useState<TimeRangePreset>("all");
	const [customStartDate, setCustomStartDate] = useState<string>("");
	const [customEndDate, setCustomEndDate] = useState<string>("");

	// Pagination
	const PAGE_SIZE = 10;
	const [currentPage, setCurrentPage] = useState<number>(1);

	// Unread tracking
	const { unreadCount, markAsRead, markAllAsRead } = useAlertStore();

	// Alerts feed - polls every 5 seconds
	const { alerts, isLoading } = useAlerts({
		enabled: true,
		interval: 5000,
		severityFilters,
		limit: 100,
	});

	useEffect(() => {
		setSelectedAlertId(queryAlertId);
		if (queryAlertId) {
			markAsRead(queryAlertId);
		}
	}, [queryAlertId, markAsRead]);

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
		markAsRead(alert.id);
		setSelectedAlertId(alert.id);
		setSearchParams({ id: String(alert.id) });
	};

	const handleCloseDetail = () => {
		setSelectedAlertId(null);
		setSearchParams({});
	};

	const handleMarkAllRead = () => {
		markAllAsRead(alerts.map((a) => a.id));
	};

	// Date-time filtering
	const filteredAlerts = useMemo(() => {
		const now = Date.now();

		return alerts.filter((alert) => {
			const alertTime = parseUtcDate(alert.timestamp).getTime();

			if (timePreset === "15m") {
				return alertTime >= now - 15 * 60 * 1000;
			}
			if (timePreset === "1h") {
				return alertTime >= now - 60 * 60 * 1000;
			}
			if (timePreset === "24h") {
				return alertTime >= now - 24 * 60 * 60 * 1000;
			}
			if (timePreset === "custom") {
				if (customStartDate) {
					const start = new Date(customStartDate).getTime();
					if (alertTime < start) return false;
				}
				if (customEndDate) {
					const end = new Date(customEndDate).getTime();
					if (alertTime > end) return false;
				}
				return true;
			}
			return true;
		});
	}, [alerts, timePreset, customStartDate, customEndDate]);

	// Reset page when any filter changes
	useEffect(() => {
		setCurrentPage(1);
	}, [severityFilters, timePreset, customStartDate, customEndDate]);

	// Pagination calculations
	const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));
	const safeCurrentPage = Math.min(currentPage, totalPages);

	const paginatedAlerts = useMemo(() => {
		const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
		return filteredAlerts.slice(startIndex, startIndex + PAGE_SIZE);
	}, [filteredAlerts, safeCurrentPage]);

	const startDisplayIndex =
		filteredAlerts.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
	const endDisplayIndex = Math.min(
		safeCurrentPage * PAGE_SIZE,
		filteredAlerts.length,
	);

	return (
		<Layout>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<div className="flex items-center gap-3">
							<h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
								Security Alerts
							</h1>
							{unreadCount > 0 && (
								<Badge variant="critical" size="md" dot>
									{unreadCount} UNREAD
								</Badge>
							)}
						</div>
						<p className="text-sm text-text-secondary mt-1">
							Plain-language intrusion advisor showing detected anomalies and
							state-machine violations.
						</p>
					</div>

					<div className="flex items-center gap-2">
						{unreadCount > 0 && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleMarkAllRead}
								leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
							>
								Mark All Read
							</Button>
						)}
						<span className="text-xs bg-surface-2 text-text-secondary border border-border-subtle px-3 py-1.5 rounded-xl font-mono">
							{filteredAlerts.length} filtered / {alerts.length} total
						</span>
					</div>
				</div>

				{/* Filters Section: Severity Bar + Date-Time Filter Bar */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-5 space-y-4 transition-colors">
					<div>
						<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2.5">
							<Filter className="w-3.5 h-3.5" />
							<span>Filter by Severity</span>
						</div>
						<SeverityFilterBar
							activeFilters={severityFilters}
							onFilterToggle={handleFilterToggle}
						/>
					</div>

					<div className="pt-3 border-t border-border-subtle/70">
						<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2.5">
							<Clock className="w-3.5 h-3.5" />
							<span>Time Range Window</span>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{[
								{ id: "all", label: "All Time" },
								{ id: "15m", label: "Last 15m" },
								{ id: "1h", label: "Last 1 Hour" },
								{ id: "24h", label: "Last 24 Hours" },
								{ id: "custom", label: "Custom Range" },
							].map((preset) => (
								<button
									key={preset.id}
									onClick={() => setTimePreset(preset.id as TimeRangePreset)}
									className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
										timePreset === preset.id
											? "bg-primary text-[var(--surface-0)] border-primary font-semibold shadow-xs"
											: "bg-surface-2 text-text-secondary border-border-subtle hover:text-text-primary hover:bg-surface-2/80"
									}`}
								>
									{preset.label}
								</button>
							))}
						</div>

						{/* Custom Date Range Picker */}
						{timePreset === "custom" && (
							<div className="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-border-subtle/50 text-xs">
								<div className="flex items-center gap-2">
									<span className="text-text-tertiary flex items-center gap-1">
										<Calendar className="w-3.5 h-3.5" />
										From:
									</span>
									<input
										type="datetime-local"
										value={customStartDate}
										onChange={(e) => setCustomStartDate(e.target.value)}
										className="bg-surface-2 border border-border-subtle rounded-lg px-2.5 py-1 text-text-primary font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>

								<div className="flex items-center gap-2">
									<span className="text-text-tertiary flex items-center gap-1">
										<Calendar className="w-3.5 h-3.5" />
										To:
									</span>
									<input
										type="datetime-local"
										value={customEndDate}
										onChange={(e) => setCustomEndDate(e.target.value)}
										className="bg-surface-2 border border-border-subtle rounded-lg px-2.5 py-1 text-text-primary font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>

								{(customStartDate || customEndDate) && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setCustomStartDate("");
											setCustomEndDate("");
										}}
										className="text-xs"
									>
										Clear dates
									</Button>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Alert Feed Card with Pagination Controls */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 space-y-5 transition-colors">
					{/* Feed Header */}
					<div className="flex items-center justify-between text-xs text-text-secondary border-b border-border-subtle pb-3">
						<span>
							Showing{" "}
							<strong className="text-text-primary font-mono">
								{startDisplayIndex}
							</strong>{" "}
							-{" "}
							<strong className="text-text-primary font-mono">
								{endDisplayIndex}
							</strong>{" "}
							of{" "}
							<strong className="text-text-primary font-mono">
								{filteredAlerts.length}
							</strong>{" "}
							alerts
						</span>
						<span className="font-mono text-text-tertiary">
							Page {safeCurrentPage} of {totalPages}
						</span>
					</div>

					{/* Feed Items (10 per page max) */}
					<AlertFeed
						alerts={paginatedAlerts}
						isLoading={isLoading}
						onAlertClick={handleAlertClick}
					/>

					{/* Pagination Footer */}
					{filteredAlerts.length > PAGE_SIZE && (
						<div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border-subtle">
							<div className="text-xs text-text-tertiary font-mono">
								10 alerts per page
							</div>

							<div className="flex items-center gap-1.5">
								<Button
									variant="outline"
									size="sm"
									disabled={safeCurrentPage <= 1}
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									leftIcon={<ChevronLeft className="w-4 h-4" />}
								>
									Previous
								</Button>

								{/* Page Numbers */}
								<div className="flex items-center gap-1 px-1">
									{Array.from({ length: totalPages }, (_, i) => i + 1)
										.filter(
											(page) =>
												page === 1 ||
												page === totalPages ||
												Math.abs(page - safeCurrentPage) <= 1,
										)
										.map((page, idx, arr) => {
											const prevPage = arr[idx - 1];
											const showEllipsis = prevPage && page - prevPage > 1;

											return (
												<React.Fragment key={page}>
													{showEllipsis && (
														<span className="px-1 text-text-tertiary">...</span>
													)}
													<button
														onClick={() => setCurrentPage(page)}
														className={`w-8 h-8 rounded-lg text-xs font-mono font-medium cursor-pointer transition-all ${
															safeCurrentPage === page
																? "bg-primary text-[var(--surface-0)] font-bold shadow-xs"
																: "bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-2/80"
														}`}
													>
														{page}
													</button>
												</React.Fragment>
											);
										})}
								</div>

								<Button
									variant="outline"
									size="sm"
									disabled={safeCurrentPage >= totalPages}
									onClick={() =>
										setCurrentPage((p) => Math.min(totalPages, p + 1))
									}
									rightIcon={<ChevronRight className="w-4 h-4" />}
								>
									Next
								</Button>
							</div>
						</div>
					)}
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

export default AlertsView;
