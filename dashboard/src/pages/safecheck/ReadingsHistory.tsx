import React, { useState, useEffect, useCallback, useMemo } from "react";
import { safecheckAPI } from "../../api/safecheck.api";
import type { Reading } from "../../types/safecheck.types";
import { Layout } from "../../components/layout/Layout";
import { DateRangePicker, DataExportButton } from "../../components/historical";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { usePlantStore } from "../../store/plantStore";
import { toast } from "sonner";
import {
	Database,
	Trash2,
	RotateCcw,
	ChevronLeft,
	ChevronRight,
	CheckSquare,
	Square,
	MinusSquare,
	X,
	Clock,
} from "lucide-react";
import {
	getRelativeTime,
	formatDateTime,
	toLocalDatetimeInputString,
	parseLocalDatetimeToUtcIso,
} from "../../utils/timeUtils";

type TimePreset = "all" | "15m" | "1h" | "24h" | "custom";

export const ReadingsHistory: React.FC = () => {
	const { plantState, isConnected } = usePlantStore();

	const [readings, setReadings] = useState<Reading[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isBulkDeleting, setIsBulkDeleting] = useState(false);

	// Time filters
	const [timePreset, setTimePreset] = useState<TimePreset>("all");
	const [customStartDate, setCustomStartDate] = useState<string>(() =>
		toLocalDatetimeInputString(new Date(Date.now() - 24 * 60 * 60 * 1000)),
	);
	const [customEndDate, setCustomEndDate] = useState<string>(() =>
		toLocalDatetimeInputString(new Date()),
	);

	// Multi-select state
	const [selectedReadingIds, setSelectedReadingIds] = useState<Set<number>>(
		new Set(),
	);

	// Pagination (10 per page)
	const PAGE_SIZE = 10;
	const [currentPage, setCurrentPage] = useState<number>(1);

	// Dynamic live trendline points (up to 40 data points)
	const [liveTrendline, setLiveTrendline] = useState<
		Array<{ timestamp: string; water_level: number }>
	>([]);

	// Initial data fetch and recurrent polling
	const loadReadings = useCallback(async () => {
		try {
			let startIso: string | undefined;
			let endIso: string | undefined;

			const now = Date.now();
			if (timePreset === "15m") {
				startIso = new Date(now - 15 * 60 * 1000).toISOString();
			} else if (timePreset === "1h") {
				startIso = new Date(now - 60 * 60 * 1000).toISOString();
			} else if (timePreset === "24h") {
				startIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
			} else if (timePreset === "custom") {
				if (customStartDate)
					startIso = parseLocalDatetimeToUtcIso(customStartDate);
				if (customEndDate) endIso = parseLocalDatetimeToUtcIso(customEndDate);
			}

			const data = await safecheckAPI.getReadingsHistory({
				start: startIso,
				end: endIso,
				limit: 100,
				offset: 0,
			});

			setReadings(data);

			// Populate or seed trendline with chronological points
			setLiveTrendline((prev) => {
				if (prev.length === 0 && data.length > 0) {
					return [...data]
						.reverse()
						.slice(-40)
						.map((r) => ({
							timestamp: r.timestamp,
							water_level: r.water_level,
						}));
				}
				return prev;
			});
		} catch (error) {
			console.error("Failed to fetch readings:", error);
		} finally {
			setIsLoading(false);
		}
	}, [timePreset, customStartDate, customEndDate]);

	useEffect(() => {
		setIsLoading(true);
		loadReadings();

		// Auto poll readings every 3 seconds
		const interval = setInterval(loadReadings, 3000);
		return () => clearInterval(interval);
	}, [loadReadings]);

	// Continuous dynamic live stream from global plant state
	useEffect(() => {
		if (plantState) {
			setLiveTrendline((prev) => {
				const lastPoint = prev[prev.length - 1];
				// Avoid duplicate if timestamp is identical
				if (lastPoint && lastPoint.timestamp === plantState.timestamp) {
					return prev;
				}
				const next = [
					...prev,
					{
						timestamp: plantState.timestamp,
						water_level: plantState.water_level,
					},
				];
				return next.slice(-40); // maintain last 40 telemetry points
			});
		}
	}, [plantState]);

	// Filtered readings
	const filteredReadings = useMemo(() => {
		return readings;
	}, [readings]);

	// Reset page when filter changes
	useEffect(() => {
		setCurrentPage(1);
		setSelectedReadingIds(new Set());
	}, [timePreset, customStartDate, customEndDate]);

	// Pagination calculations
	const totalPages = Math.max(
		1,
		Math.ceil(filteredReadings.length / PAGE_SIZE),
	);
	const paginatedReadings = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filteredReadings.slice(start, start + PAGE_SIZE);
	}, [filteredReadings, currentPage]);

	// Adjust page if out of bounds
	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	// Selection handlers
	const isAllPageSelected = useMemo(() => {
		if (paginatedReadings.length === 0) return false;
		return paginatedReadings.every((r) => selectedReadingIds.has(r.id!));
	}, [paginatedReadings, selectedReadingIds]);

	const isSomePageSelected = useMemo(() => {
		return (
			paginatedReadings.some((r) => selectedReadingIds.has(r.id!)) &&
			!isAllPageSelected
		);
	}, [paginatedReadings, selectedReadingIds, isAllPageSelected]);

	const toggleSelectAllPage = () => {
		setSelectedReadingIds((prev) => {
			const next = new Set(prev);
			if (isAllPageSelected) {
				paginatedReadings.forEach((r) => next.delete(r.id!));
			} else {
				paginatedReadings.forEach((r) => next.add(r.id!));
			}
			return next;
		});
	};

	const toggleSelectRow = (id: number) => {
		setSelectedReadingIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleSelectAllFiltered = () => {
		setSelectedReadingIds(new Set(filteredReadings.map((r) => r.id!)));
	};

	const handleClearSelection = () => {
		setSelectedReadingIds(new Set());
	};

	// Deletion actions
	const handleDeleteSingle = async (id: number) => {
		try {
			await safecheckAPI.deleteReading(id);
			setReadings((prev) => prev.filter((r) => r.id !== id));
			setSelectedReadingIds((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
			toast.success(`Reading #${id} deleted`);
		} catch (error) {
			console.error("Failed to delete reading:", error);
			toast.error("Failed to delete reading");
		}
	};

	const handleDeleteSelected = async () => {
		if (selectedReadingIds.size === 0) return;
		const count = selectedReadingIds.size;
		setIsBulkDeleting(true);
		try {
			await safecheckAPI.batchDeleteReadings(Array.from(selectedReadingIds));
			setReadings((prev) => prev.filter((r) => !selectedReadingIds.has(r.id!)));
			setSelectedReadingIds(new Set());
			toast.success(`Deleted ${count} readings`);
		} catch (error) {
			console.error("Failed to delete readings:", error);
			toast.error("Failed to delete selected readings");
		} finally {
			setIsBulkDeleting(false);
		}
	};

	const handleClearAll = async () => {
		if (
			!window.confirm("Are you sure you want to clear all reading history?")
		) {
			return;
		}
		setIsBulkDeleting(true);
		try {
			await safecheckAPI.clearAllReadings();
			setReadings([]);
			setLiveTrendline([]);
			setSelectedReadingIds(new Set());
			toast.success("All readings cleared");
		} catch (error) {
			console.error("Failed to clear readings:", error);
			toast.error("Failed to clear readings history");
		} finally {
			setIsBulkDeleting(false);
		}
	};

	const handleExport = () => {
		return `readings_${new Date().toISOString().slice(0, 10)}`;
	};

	// Trendline calculations
	const trendlineSource =
		liveTrendline.length > 0
			? liveTrendline
			: [...readings]
					.reverse()
					.slice(-40)
					.map((r) => ({
						timestamp: r.timestamp,
						water_level: r.water_level,
					}));

	const levels = trendlineSource.map((p) => p.water_level);
	const minLevel = levels.length ? Math.min(...levels) : 0;
	const maxLevel = levels.length ? Math.max(...levels) : 0;
	const avgLevel = levels.length
		? levels.reduce((a, b) => a + b, 0) / levels.length
		: 0;
	const currentLevel = plantState
		? plantState.water_level
		: levels.length
			? levels[levels.length - 1]
			: 0;

	const chartWidth = 800;
	const chartHeight = 160;
	const points = trendlineSource.map((p, i) => {
		const x = (i / Math.max(1, trendlineSource.length - 1)) * chartWidth;
		const y = chartHeight - (p.water_level / 100) * (chartHeight - 24) - 12;
		return { x, y, level: p.water_level };
	});

	const linePath = points.length
		? `M ${points.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" L ")}`
		: "";
	const areaPath = points.length
		? `M 0,${chartHeight} L ${points.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" L ")} L ${chartWidth},${chartHeight} Z`
		: "";
	const latestPoint = points.length ? points[points.length - 1] : null;

	return (
		<Layout>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<div className="flex items-center gap-3">
							<h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
								Physical Telemetry Readings
							</h1>
							<span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
								<span
									className={`w-2 h-2 rounded-full ${
										isConnected
											? "bg-emerald-500 animate-pulse"
											: "bg-amber-500"
									}`}
								/>
								{isConnected ? "Live Auto-Polling" : "Modbus Standby"}
							</span>
						</div>
						<p className="text-sm text-text-secondary mt-1">
							Continuous sensor trajectory and historical water level telemetry
							polled via Modbus.
						</p>
					</div>

					<div className="flex items-center gap-2">
						<DataExportButton
							data={filteredReadings}
							filename={handleExport()}
							disabled={isLoading || filteredReadings.length === 0}
						/>
						{filteredReadings.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleClearAll}
								leftIcon={<Trash2 className="w-3.5 h-3.5 text-critical" />}
								className="text-critical hover:bg-critical/10"
							>
								Clear History
							</Button>
						)}
					</div>
				</div>

				{/* Dynamic Live Water Level Trendline Card */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 transition-colors">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base font-bold text-text-primary">
									Water Level Dynamic Trendline
								</h3>
								<Badge variant="info" size="sm" dot>
									Real-time Modbus Stream
								</Badge>
							</div>
							<p className="text-xs text-text-secondary mt-0.5">
								Dynamic continuous graph streaming sensor updates directly from
								the water plant simulator.
							</p>
						</div>

						{/* Metrics Summary Strip */}
						<div className="grid grid-cols-4 gap-2 text-center text-xs">
							<div className="bg-surface-2 px-3 py-1.5 rounded-lg border border-border-subtle">
								<span className="text-text-tertiary block text-[10px] uppercase font-semibold">
									Current
								</span>
								<span className="font-bold text-primary text-sm">
									{currentLevel.toFixed(1)}%
								</span>
							</div>
							<div className="bg-surface-2 px-3 py-1.5 rounded-lg border border-border-subtle">
								<span className="text-text-tertiary block text-[10px] uppercase font-semibold">
									Average
								</span>
								<span className="font-bold text-text-primary text-sm">
									{avgLevel.toFixed(1)}%
								</span>
							</div>
							<div className="bg-surface-2 px-3 py-1.5 rounded-lg border border-border-subtle">
								<span className="text-text-tertiary block text-[10px] uppercase font-semibold">
									Min
								</span>
								<span className="font-bold text-text-primary text-sm">
									{minLevel.toFixed(1)}%
								</span>
							</div>
							<div className="bg-surface-2 px-3 py-1.5 rounded-lg border border-border-subtle">
								<span className="text-text-tertiary block text-[10px] uppercase font-semibold">
									Max
								</span>
								<span className="font-bold text-text-primary text-sm">
									{maxLevel.toFixed(1)}%
								</span>
							</div>
						</div>
					</div>

					{/* SVG Dynamic Live Chart */}
					<div className="relative w-full h-44 bg-surface-2/60 rounded-xl overflow-hidden border border-border-subtle p-2">
						{/* Danger Line (95%) */}
						<div
							className="absolute left-0 right-0 border-b border-dashed border-red-500/60 z-10 flex items-center justify-end pr-2"
							style={{ bottom: "95%" }}
						>
							<span className="text-[9px] font-mono font-bold text-red-500 bg-surface-1 px-1 rounded shadow-2xs">
								DANGER 95%
							</span>
						</div>

						{/* Warn Line (85%) */}
						<div
							className="absolute left-0 right-0 border-b border-dashed border-amber-500/50 z-10 flex items-center justify-end pr-2"
							style={{ bottom: "85%" }}
						>
							<span className="text-[9px] font-mono font-bold text-amber-500 bg-surface-1 px-1 rounded shadow-2xs">
								WARN 85%
							</span>
						</div>

						{trendlineSource.length > 0 ? (
							<svg
								viewBox={`0 0 ${chartWidth} ${chartHeight}`}
								className="w-full h-full overflow-visible"
								preserveAspectRatio="none"
							>
								<defs>
									<linearGradient
										id="waterTrendGradient"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
										<stop
											offset="100%"
											stopColor="#0284c7"
											stopOpacity="0.02"
										/>
									</linearGradient>
								</defs>

								{/* Area Fill */}
								<path d={areaPath} fill="url(#waterTrendGradient)" />

								{/* Trajectory Line */}
								<path
									d={linePath}
									fill="none"
									stroke="#0284c7"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>

								{/* Current Point Dot */}
								{latestPoint && (
									<circle
										cx={latestPoint.x}
										cy={latestPoint.y}
										r="4.5"
										className="fill-primary stroke-white stroke-2"
									/>
								)}
							</svg>
						) : (
							<div className="flex items-center justify-center h-full text-xs text-text-tertiary">
								Waiting for sensor telemetry stream...
							</div>
						)}
					</div>
				</div>

				{/* Filter Toolbar */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-5 transition-colors space-y-4">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						{/* Preset Buttons */}
						<div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-2 rounded-xl border border-border-subtle text-xs">
							<span className="text-text-tertiary px-2 py-1 font-semibold flex items-center gap-1">
								<Clock className="w-3.5 h-3.5" />
								Time:
							</span>
							{(
								[
									{ id: "all", label: "All Logs" },
									{ id: "15m", label: "Last 15m" },
									{ id: "1h", label: "Last 1h" },
									{ id: "24h", label: "Last 24h" },
									{ id: "custom", label: "Custom Range" },
								] as const
							).map((preset) => (
								<button
									key={preset.id}
									type="button"
									onClick={() => setTimePreset(preset.id)}
									className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
										timePreset === preset.id
											? "bg-surface-1 text-primary shadow-xs font-semibold"
											: "text-text-secondary hover:text-text-primary"
									}`}
								>
									{preset.label}
								</button>
							))}
						</div>

						{timePreset !== "all" && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setTimePreset("all")}
								leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
							>
								Reset Filter
							</Button>
						)}
					</div>

					{/* Custom Range Picker */}
					{timePreset === "custom" && (
						<div className="pt-3 border-t border-border-subtle/60">
							<DateRangePicker
								startDate={customStartDate}
								endDate={customEndDate}
								onStartDateChange={setCustomStartDate}
								onEndDateChange={setCustomEndDate}
							/>
						</div>
					)}
				</div>

				{/* Bulk Action Sticky Bar */}
				{selectedReadingIds.size > 0 && (
					<div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all">
						<div className="flex items-center gap-3">
							<span className="text-sm font-semibold text-text-primary">
								{selectedReadingIds.size} reading
								{selectedReadingIds.size === 1 ? "" : "s"} selected
							</span>
							{selectedReadingIds.size < filteredReadings.length && (
								<button
									type="button"
									onClick={handleSelectAllFiltered}
									className="text-xs text-primary font-medium hover:underline"
								>
									Select all {filteredReadings.length} readings
								</button>
							)}
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="danger"
								size="sm"
								onClick={handleDeleteSelected}
								isLoading={isBulkDeleting}
								leftIcon={<Trash2 className="w-3.5 h-3.5" />}
							>
								Delete Selected ({selectedReadingIds.size})
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleClearSelection}
								leftIcon={<X className="w-3.5 h-3.5" />}
							>
								Cancel
							</Button>
						</div>
					</div>
				)}

				{/* Readings Table Card */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 transition-colors">
					{isLoading && readings.length === 0 ? (
						<div className="flex justify-center py-16">
							<Spinner size="lg" label="Loading sensor telemetry logs..." />
						</div>
					) : filteredReadings.length === 0 ? (
						<div className="text-center py-16 px-4">
							<div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-subtle text-text-tertiary mx-auto flex items-center justify-center mb-3">
								<Database className="w-6 h-6" />
							</div>
							<h3 className="text-sm font-semibold text-text-primary">
								No Telemetry Readings Recorded
							</h3>
							<p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
								No physical sensor logs match the selected filter. Modbus poller
								is running and collecting new telemetry.
							</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-border-subtle">
									<thead className="bg-surface-2">
										<tr>
											{/* Master Checkbox */}
											<th className="w-12 px-4 py-3.5 text-left">
												<button
													type="button"
													onClick={toggleSelectAllPage}
													className="text-text-tertiary hover:text-primary transition-colors cursor-pointer"
													title={
														isAllPageSelected ? "Deselect Page" : "Select Page"
													}
												>
													{isAllPageSelected ? (
														<CheckSquare className="w-4 h-4 text-primary" />
													) : isSomePageSelected ? (
														<MinusSquare className="w-4 h-4 text-primary" />
													) : (
														<Square className="w-4 h-4" />
													)}
												</button>
											</th>
											<th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
												Timestamp
											</th>
											<th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
												Water Level
											</th>
											<th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
												Pump Actuator
											</th>
											<th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
												Drain Valve
											</th>
											<th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
												Source
											</th>
											<th className="px-4 py-3.5 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="bg-surface-1 divide-y divide-border-subtle">
										{paginatedReadings.map((reading) => {
											const isSelected = selectedReadingIds.has(reading.id!);
											return (
												<tr
													key={reading.id}
													className={`transition-colors ${
														isSelected
															? "bg-primary/5 hover:bg-primary/10"
															: "hover:bg-surface-2/60"
													}`}
												>
													{/* Row Checkbox */}
													<td className="w-12 px-4 py-4">
														<button
															type="button"
															onClick={() => toggleSelectRow(reading.id!)}
															className="text-text-tertiary hover:text-primary transition-colors cursor-pointer"
														>
															{isSelected ? (
																<CheckSquare className="w-4 h-4 text-primary" />
															) : (
																<Square className="w-4 h-4" />
															)}
														</button>
													</td>
													{/* Timestamp */}
													<td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
														<div className="font-medium">
															{getRelativeTime(reading.timestamp)}
														</div>
														<div className="text-xs text-text-tertiary font-mono">
															{formatDateTime(reading.timestamp)}
														</div>
													</td>
													{/* Water Level */}
													<td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-text-primary">
														<div className="flex items-center gap-2">
															<span
																className={
																	reading.water_level >= 95
																		? "text-red-500 font-extrabold"
																		: reading.water_level >= 85
																			? "text-amber-500 font-bold"
																			: "text-text-primary"
																}
															>
																{reading.water_level.toFixed(1)}%
															</span>
															{reading.water_level >= 95 && (
																<Badge variant="critical" size="sm">
																	DANGER
																</Badge>
															)}
														</div>
													</td>
													{/* Pump State */}
													<td className="px-6 py-4 whitespace-nowrap text-sm">
														{reading.pump_state ? (
															<Badge variant="success" size="sm">
																RUNNING
															</Badge>
														) : (
															<Badge variant="neutral" size="sm">
																STOPPED
															</Badge>
														)}
													</td>
													{/* Valve State */}
													<td className="px-6 py-4 whitespace-nowrap text-sm">
														{reading.valve_state ? (
															<Badge variant="success" size="sm">
																OPEN
															</Badge>
														) : (
															<Badge variant="neutral" size="sm">
																CLOSED
															</Badge>
														)}
													</td>
													{/* Source */}
													<td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-text-tertiary">
														{reading.source}
													</td>
													{/* Action */}
													<td className="px-4 py-4 whitespace-nowrap text-right text-sm">
														<button
															type="button"
															onClick={() => handleDeleteSingle(reading.id!)}
															className="p-1.5 rounded-lg text-text-tertiary hover:text-critical hover:bg-critical/10 transition-colors"
															title="Delete reading"
														>
															<Trash2 className="w-4 h-4" />
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Pagination Controls */}
							<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border-subtle/60">
								<div className="text-xs text-text-secondary">
									Showing{" "}
									<span className="font-semibold text-text-primary">
										{(currentPage - 1) * PAGE_SIZE + 1}
									</span>{" "}
									to{" "}
									<span className="font-semibold text-text-primary">
										{Math.min(currentPage * PAGE_SIZE, filteredReadings.length)}
									</span>{" "}
									of{" "}
									<span className="font-semibold text-text-primary">
										{filteredReadings.length}
									</span>{" "}
									readings
								</div>

								<div className="flex items-center gap-1.5">
									<Button
										variant="secondary"
										size="sm"
										onClick={() =>
											setCurrentPage((prev) => Math.max(1, prev - 1))
										}
										disabled={currentPage === 1}
										leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
									>
										Previous
									</Button>

									<span className="px-3 py-1 text-xs font-medium text-text-primary">
										Page {currentPage} of {totalPages}
									</span>

									<Button
										variant="secondary"
										size="sm"
										onClick={() =>
											setCurrentPage((prev) => Math.min(totalPages, prev + 1))
										}
										disabled={currentPage >= totalPages}
										rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
									>
										Next
									</Button>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</Layout>
	);
};
