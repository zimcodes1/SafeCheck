import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAlerts, useAlertDetail } from "../../hooks/useAlerts";
import type { AlertOut, Severity } from "../../types/safecheck.types";
import type { AlertOut } from "../../types/safecheck.types";
import {
	AlertFeed,
	SeverityFilterBar,
	type SeverityTab,
	AlertDetailPanel,
} from "../../components/alerts";
import { Layout } from "../../components/layout/Layout";
import { Button, Badge } from "../../components/ui";
import { useAlertStore } from "../../store/alertStore";
import { parseUtcDate } from "../../utils/timeUtils";
import { safecheckAPI } from "../../api/safecheck.api";
import { toast } from "sonner";
import {
	Clock,
	ChevronLeft,
	ChevronRight,
	CheckCheck,
	Calendar,
	Filter,
	Trash2,
	X,
	CheckSquare,
	Square,
	MinusSquare,
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

	// Severity Tab navigation ("all" | "critical" | "warning" | "info")
	const [activeSeverityTab, setActiveSeverityTab] =
		useState<SeverityTab>("all");

	// Selection tracking
	const [selectedAlertIds, setSelectedAlertIds] = useState<Set<number>>(
		new Set(),
	);
	const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

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
	// Alerts feed - polls every 5 seconds (fetches all severities so tab counts are live)
	const { alerts, isLoading, refetch } = useAlerts({
		enabled: true,
		interval: 5000,
		severityFilters,
		limit: 100,
		limit: 200,
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
	// 1. Time-filtered alerts
	const timeFilteredAlerts = useMemo(() => {
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
	// Counts for each severity tab
	const severityCounts = useMemo(() => {
		return {
			all: timeFilteredAlerts.length,
			critical: timeFilteredAlerts.filter((a) => a.severity === "critical").length,
			warning: timeFilteredAlerts.filter((a) => a.severity === "warning").length,
			info: timeFilteredAlerts.filter((a) => a.severity === "info").length,
		};
	}, [timeFilteredAlerts]);

	// 2. Tab-filtered alerts
	const filteredAlerts = useMemo(() => {
		if (activeSeverityTab === "all") {
			return timeFilteredAlerts;
		}
		return timeFilteredAlerts.filter((a) => a.severity === activeSeverityTab);
	}, [timeFilteredAlerts, activeSeverityTab]);

	// Reset page when tab or time preset changes
	useEffect(() => {
		setCurrentPage(1);
	}, [severityFilters, timePreset, customStartDate, customEndDate]);
	}, [activeSeverityTab, timePreset, customStartDate, customEndDate]);

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

	// Selection Handlers
	const handleToggleSelect = (alertId: number) => {
		setSelectedAlertIds((prev) => {
			const next = new Set(prev);
			if (next.has(alertId)) {
				next.delete(alertId);
			} else {
				next.add(alertId);
			}
			return next;
		});
	};

	const isAllPageSelected =
		paginatedAlerts.length > 0 &&
		paginatedAlerts.every((a) => selectedAlertIds.has(a.id));

	const isSomePageSelected =
		paginatedAlerts.some((a) => selectedAlertIds.has(a.id)) &&
		!isAllPageSelected;

	const handleToggleSelectAllPage = () => {
		if (isAllPageSelected) {
			setSelectedAlertIds((prev) => {
				const next = new Set(prev);
				paginatedAlerts.forEach((a) => next.delete(a.id));
				return next;
			});
		} else {
			setSelectedAlertIds((prev) => {
				const next = new Set(prev);
				paginatedAlerts.forEach((a) => next.add(a.id));
				return next;
			});
		}
	};

	const handleSelectAllFiltered = () => {
		setSelectedAlertIds(new Set(filteredAlerts.map((a) => a.id)));
		toast.info(`Selected all ${filteredAlerts.length} filtered alerts`);
	};

	const handleClearSelection = () => {
		setSelectedAlertIds(new Set());
	};

	// Bulk Actions
	const handleMarkSelectedAsRead = () => {
		const ids = Array.from(selectedAlertIds);
		if (ids.length === 0) return;
		markAllAsRead(ids);
		toast.success(`Marked ${ids.length} alert(s) as read`);
		handleClearSelection();
	};

	const handleDeleteSelected = async () => {
		const ids = Array.from(selectedAlertIds);
		if (ids.length === 0) return;

		setIsBulkDeleting(true);
		try {
			const res = await safecheckAPI.batchDeleteAlerts(ids);
			toast.success(`Deleted ${res.deleted_count} alert(s)`);
			handleClearSelection();
			await refetch();
		} catch {
			toast.error("Failed to delete selected alerts");
		} finally {
			setIsBulkDeleting(false);
		}
	};

	// Single Alert Actions
	const handleDeleteSingle = async (alertId: number) => {
		try {
			await safecheckAPI.deleteAlert(alertId);
			toast.success(`Alert #${alertId} deleted`);
			setSelectedAlertIds((prev) => {
				const next = new Set(prev);
				next.delete(alertId);
				return next;
			});
			if (selectedAlertId === alertId) {
				handleCloseDetail();
			}
			await refetch();
		} catch {
			toast.error(`Failed to delete alert #${alertId}`);
		}
	};

	const handleMarkSingleRead = (alertId: number) => {
		markAsRead(alertId);
		toast.success(`Alert #${alertId} marked as read`);
	};

	const handleMarkAllRead = () => {
		markAllAsRead(alerts.map((a) => a.id));
		toast.success("All alerts marked as read");
	};

	return (
		<Layout>
			<div className="space-y-6">
				{/* Header */}
				{/* Page Header */}
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
							Intrusion detection feed displaying physics-correlated anomalies,
							state-machine violations, and protocol alerts.
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
				{/* Filter & Navigation Card: Severity Tabs + Time Window Filter */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs overflow-hidden transition-colors">
					{/* Usual Standard Severity Tabs */}
					<div className="px-5 pt-2 bg-surface-1">
						<SeverityFilterBar
							activeFilters={severityFilters}
							onFilterToggle={handleFilterToggle}
							activeTab={activeSeverityTab}
							onTabChange={setActiveSeverityTab}
							counts={severityCounts}
						/>
					</div>

					<div className="pt-3 border-t border-border-subtle/70">
						<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2.5">
							<Clock className="w-3.5 h-3.5" />
							<span>Time Range Window</span>
					{/* Time Range Window Bar */}
					<div className="p-4 sm:px-5 bg-surface-1/60 border-t border-border-subtle/70">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
								<Clock className="w-3.5 h-3.5 text-primary" />
								<span>Time Window:</span>
							</div>

							<div className="flex flex-wrap items-center gap-1.5">
								{[
									{ id: "all", label: "All Time" },
									{ id: "15m", label: "Last 15m" },
									{ id: "1h", label: "Last 1h" },
									{ id: "24h", label: "Last 24h" },
									{ id: "custom", label: "Custom Range" },
								].map((preset) => (
									<button
										key={preset.id}
										onClick={() => setTimePreset(preset.id as TimeRangePreset)}
										className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
											timePreset === preset.id
												? "bg-primary text-[var(--surface-0)] border-primary font-semibold shadow-xs"
												: "bg-surface-2 text-text-secondary border-border-subtle hover:text-text-primary hover:bg-surface-2/80"
										}`}
									>
										{preset.label}
									</button>
								))}
							</div>
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
				{/* Floating Bulk Action Bar (Visible when >= 1 alerts are selected) */}
				{selectedAlertIds.size > 0 && (
					<div className="sticky top-4 z-20 bg-surface-1 border-2 border-primary/50 shadow-lg rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
						<div className="flex items-center gap-3">
							<span className="text-xs sm:text-sm font-semibold text-text-primary flex items-center gap-2">
								<span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-mono text-xs font-bold">
									{selectedAlertIds.size}
								</span>
								<span>alert(s) selected</span>
							</span>

							{selectedAlertIds.size < filteredAlerts.length && (
								<button
									type="button"
									onClick={handleSelectAllFiltered}
									className="text-xs text-primary hover:underline cursor-pointer font-medium"
								>
									Select all {filteredAlerts.length} filtered
								</button>
							)}
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleMarkSelectedAsRead}
								leftIcon={<CheckCheck className="w-4 h-4 text-primary" />}
							>
								Mark Read
							</Button>

							<Button
								variant="danger"
								size="sm"
								isLoading={isBulkDeleting}
								onClick={handleDeleteSelected}
								leftIcon={<Trash2 className="w-4 h-4" />}
							>
								Delete Selected
							</Button>

							<button
								type="button"
								onClick={handleClearSelection}
								className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer ml-1"
								title="Clear selection"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}

				{/* Alert Feed Card with Selection Bar & Pagination */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-5 sm:p-6 space-y-4 transition-colors">
					{/* Table Controls / Select All Bar */}
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
						<div className="flex items-center gap-2.5">
							{paginatedAlerts.length > 0 && (
								<button
									type="button"
									onClick={handleToggleSelectAllPage}
									className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary cursor-pointer p-0.5 rounded"
									title={isAllPageSelected ? "Deselect page" : "Select page"}
								>
									{isAllPageSelected ? (
										<CheckSquare className="w-4 h-4 text-primary" />
									) : isSomePageSelected ? (
										<MinusSquare className="w-4 h-4 text-primary" />
									) : (
										<Square className="w-4 h-4 text-text-tertiary" />
									)}
									<span className="hidden sm:inline">Select Page</span>
								</button>
							)}

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
						</div>

						<span className="font-mono text-text-tertiary">
							Page {safeCurrentPage} of {totalPages}
						</span>
					</div>

					{/* Feed Items (10 per page max) */}
					<AlertFeed
						alerts={paginatedAlerts}
						isLoading={isLoading}
						selectedAlertIds={selectedAlertIds}
						onToggleSelect={handleToggleSelect}
						onAlertClick={handleAlertClick}
						onDeleteAlert={handleDeleteSingle}
						onMarkReadAlert={handleMarkSingleRead}
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
										.filter((page) => {
											if (totalPages <= 5) return true;
											return (
												page === 1 ||
												page === totalPages ||
												Math.abs(page - safeCurrentPage) <= 1,
										)
												Math.abs(page - safeCurrentPage) <= 1
											);
										})
										.map((page, idx, arr) => {
											const prevPage = arr[idx - 1];
											const showEllipsis = prevPage && page - prevPage > 1;
											const prev = arr[idx - 1];
											const showEllipsis = prev && page - prev > 1;

											return (
												<React.Fragment key={page}>
													{showEllipsis && (
														<span className="px-1 text-text-tertiary">...</span>
														<span className="text-xs text-text-tertiary px-1 font-mono">
															...
														</span>
													)}
													<button
														onClick={() => setCurrentPage(page)}
														className={`w-8 h-8 rounded-lg text-xs font-mono font-medium cursor-pointer transition-all ${
														className={`w-8 h-8 rounded-lg text-xs font-mono font-medium cursor-pointer transition-colors ${
															safeCurrentPage === page
																? "bg-primary text-[var(--surface-0)] font-bold shadow-xs"
																: "bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-2/80"
																: "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
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
				{/* Detailed Alert Forensics Modal */}
				<AlertDetailPanel
					isOpen={selectedAlertId !== null}
					alert={alertDetail}
					isOpen={!!selectedAlertId && !!alertDetail}
					onClose={handleCloseDetail}
					onDelete={
						selectedAlertId
							? () => handleDeleteSingle(selectedAlertId)
							: undefined
					}
				/>
			</div>
		</Layout>
	);
};

export default AlertsView;
