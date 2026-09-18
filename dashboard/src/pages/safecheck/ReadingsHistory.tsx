import React, { useState, useEffect, useCallback, useRef } from "react";
import { safecheckAPI } from "../../api/safecheck.api";
import type { Reading } from "../../types/safecheck.types";
import { Layout } from "../../components/layout/Layout";
import { DateRangePicker, DataExportButton } from "../../components/historical";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Database } from "lucide-react";
import { getRelativeTime, formatDateTime } from "../../utils/timeUtils";

export const ReadingsHistory: React.FC = () => {
	const [readings, setReadings] = useState<Reading[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [startDate, setStartDate] = useState(
		new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
	);
	const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 16));
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const hasInitialized = useRef(false);

	const loadReadings = useCallback(
		async (resetPage = false) => {
			setIsLoading(true);
			try {
				const currentPage = resetPage ? 0 : page;
				const data = await safecheckAPI.getReadingsHistory({
					start: startDate ? new Date(startDate).toISOString() : undefined,
					end: endDate ? new Date(endDate).toISOString() : undefined,
					limit: 50,
					offset: currentPage * 50,
				});

				if (resetPage) {
					setReadings(data);
					setPage(0);
				} else {
					setReadings((prev) => [...prev, ...data]);
				}

				setHasMore(data.length === 50);
			} catch (error) {
				console.error("Failed to load readings:", error);
			} finally {
				setIsLoading(false);
			}
		},
		[startDate, endDate, page],
	);

	useEffect(() => {
		if (!hasInitialized.current) {
			hasInitialized.current = true;
			loadReadings(true);
		}
	}, [loadReadings]);

	const handleLoadMore = () => {
		setPage((prev) => prev + 1);
		loadReadings();
	};

	const handleExport = () => {
		const filename = `readings_${new Date().toISOString().slice(0, 10)}`;
		return filename;
	};

	// Prepare chronological data for trendline (readings arrive newest first)
	const chronologicalReadings = [...readings].reverse();
	const waterLevels = readings.map((r) => r.water_level);
	const minLevel = waterLevels.length ? Math.min(...waterLevels) : 0;
	const maxLevel = waterLevels.length ? Math.max(...waterLevels) : 0;
	const avgLevel = waterLevels.length
		? waterLevels.reduce((acc, curr) => acc + curr, 0) / waterLevels.length
		: 0;
	const latestLevel = readings.length ? readings[0].water_level : 0;

	// Generate SVG path for trendline
	const chartWidth = 800;
	const chartHeight = 160;
	const points = chronologicalReadings.map((r, i) => {
		const x = (i / Math.max(1, chronologicalReadings.length - 1)) * chartWidth;
		// Map 0-100% to chartHeight - 10 down to 10
		const y = chartHeight - (r.water_level / 100) * (chartHeight - 20) - 10;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});

	const linePath = points.length ? `M ${points.join(" L ")}` : "";
	const areaPath = points.length
		? `M 0,${chartHeight} L ${points.join(" L ")} L ${chartWidth},${chartHeight} Z`
		: "";

	return (
		<Layout>
			<div className="space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
							Physical Telemetry Readings
						</h1>
						<p className="text-sm text-text-secondary mt-1">
							Time-series logs of water tank levels and actuator states polled
							via Modbus.
						</p>
					</div>
					<DataExportButton
						data={readings}
						filename={handleExport()}
						disabled={isLoading}
					/>
				</div>

				{/* Filters */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-5 transition-colors">
					<DateRangePicker
						startDate={startDate}
						endDate={endDate}
						onStartDateChange={(date) => {
							setStartDate(date);
							setPage(0);
							loadReadings(true);
						}}
						onEndDateChange={(date) => {
							setEndDate(date);
							setPage(0);
							loadReadings(true);
						}}
					/>
				</div>

				{/* Trendline Chart Card */}
				{readings.length > 0 && (
					<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 transition-colors">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
							<div>
								<h3 className="text-base font-bold text-text-primary flex items-center gap-2">
									<span>Water Level Trendline</span>
									<span className="text-xs font-mono font-normal text-text-tertiary">
										({readings.length} data points)
									</span>
								</h3>
								<p className="text-xs text-text-secondary mt-0.5">
									Visual sensor trajectory displaying high-water safety margin
								</p>
							</div>

							{/* Metrics Summary Strip */}
							<div className="grid grid-cols-4 gap-2 text-center text-xs">
								<div className="bg-surface-2 px-3 py-1.5 rounded-lg border border-border-subtle">
									<span className="text-text-tertiary block text-[10px] uppercase font-semibold">
										Latest
									</span>
									<span className="font-bold text-text-primary text-sm">
										{latestLevel.toFixed(1)}%
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

						{/* SVG Chart Graphic */}
						<div className="relative w-full h-44 bg-surface-2/60 rounded-xl overflow-hidden border border-border-subtle p-2">
							{/* Threshold Guides */}
							<div
								className="absolute left-0 right-0 border-b border-dashed border-red-500/60 z-10 flex items-center justify-end pr-2"
								style={{ bottom: `${95}%` }}
							>
								<span className="text-[9px] font-mono font-bold text-red-500 bg-surface-1 px-1 rounded shadow-2xs">
									DANGER 95%
								</span>
							</div>
							<div
								className="absolute left-0 right-0 border-b border-dashed border-amber-500/40 z-10 flex items-center justify-end pr-2"
								style={{ bottom: `${85}%` }}
							>
								<span className="text-[9px] font-mono font-bold text-amber-500 bg-surface-1 px-1 rounded shadow-2xs">
									WARN 85%
								</span>
							</div>

							<svg
								viewBox={`0 0 ${chartWidth} ${chartHeight}`}
								className="w-full h-full overflow-visible"
								preserveAspectRatio="none"
							>
								<defs>
									<linearGradient
										id="waterGradient"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
										<stop
											offset="100%"
											stopColor="#3b82f6"
											stopOpacity="0.05"
										/>
									</linearGradient>
								</defs>

								{/* Area Fill */}
								<path d={areaPath} fill="url(#waterGradient)" />

								{/* Trajectory Line */}
								<path
									d={linePath}
									fill="none"
									stroke="#0284c7"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
					</div>
				)}

				{/* Readings Table */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 transition-colors">
					{isLoading && readings.length === 0 ? (
						<div className="flex justify-center py-16">
							<Spinner size="lg" label="Loading sensor telemetry logs..." />
						</div>
					) : readings.length === 0 ? (
						<div className="text-center py-16 px-4">
							<div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-subtle text-text-tertiary mx-auto flex items-center justify-center mb-3">
								<Database className="w-6 h-6" />
							</div>
							<h3 className="text-sm font-semibold text-text-primary">
								No Telemetry Readings Recorded
							</h3>
							<p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
								No physical sensor logs found for the selected time range.
								Ensure the plant server is online and poller loop is running.
							</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-border-subtle">
									<thead className="bg-surface-2">
										<tr>
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
										</tr>
									</thead>
									<tbody className="bg-surface-1 divide-y divide-border-subtle">
										{readings.map((reading) => (
											<tr
												key={reading.id}
												className="hover:bg-surface-2/60 transition-colors"
											>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
													<div className="font-medium">
														{getRelativeTime(reading.timestamp)}
													</div>
													<div className="text-xs text-text-tertiary font-mono">
														{formatDateTime(reading.timestamp)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-text-primary">
													{reading.water_level.toFixed(1)}%
												</td>
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
												<td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-text-tertiary">
													{reading.source}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{hasMore && (
								<div className="mt-6 text-center">
									<Button
										variant="secondary"
										size="md"
										onClick={handleLoadMore}
										isLoading={isLoading}
									>
										{isLoading ? "Loading..." : "Load More"}
									</Button>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</Layout>
	);
};
