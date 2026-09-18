import React, { useState, useEffect, useCallback, useRef } from "react";
import { safecheckAPI } from "../../api/safecheck.api";
import type { Command, CommandType } from "../../types/safecheck.types";
import { Layout } from "../../components/layout/Layout";
import {
	DateRangePicker,
	DataExportButton,
	CommandLogTable,
} from "../../components/historical";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import {
	Filter,
	RotateCcw,
	ShieldAlert,
	Activity,
	CheckCircle2,
} from "lucide-react";

export const CommandsHistory: React.FC = () => {
	const [commands, setCommands] = useState<Command[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [startDate, setStartDate] = useState(() =>
		new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
	);
	const [endDate, setEndDate] = useState(() =>
		new Date().toISOString().slice(0, 16),
	);
	const [commandTypeFilter, setCommandTypeFilter] = useState<
		CommandType | "all"
	>("all");
	const [flaggedFilter, setFlaggedFilter] = useState<
		"all" | "flagged" | "normal"
	>("all");
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const hasInitialized = useRef(false);

	const loadCommands = useCallback(
		async (resetPage = false) => {
			setIsLoading(true);
			try {
				const currentPage = resetPage ? 0 : page;
				const data = await safecheckAPI.getCommandsHistory({
					start: startDate || undefined,
					end: endDate || undefined,
					limit: 50,
					offset: currentPage * 50,
				});

				// Apply client-side filters
				let filteredData = data;
				if (commandTypeFilter !== "all") {
					filteredData = filteredData.filter(
						(cmd) => cmd.command_type === commandTypeFilter,
					);
				}
				if (flaggedFilter === "flagged") {
					filteredData = filteredData.filter((cmd) => cmd.flagged === true);
				} else if (flaggedFilter === "normal") {
					filteredData = filteredData.filter((cmd) => cmd.flagged === false);
				}

				if (resetPage) {
					setCommands(filteredData);
					setPage(0);
				} else {
					setCommands((prev) => [...prev, ...filteredData]);
				}

				setHasMore(data.length === 50);
			} catch (error) {
				console.error("Failed to load commands:", error);
			} finally {
				setIsLoading(false);
			}
		},
		[startDate, endDate, commandTypeFilter, flaggedFilter, page],
	);

	// Initial data fetch on mount
	useEffect(() => {
		if (!hasInitialized.current) {
			hasInitialized.current = true;
			loadCommands(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleLoadMore = () => {
		setPage((prev) => prev + 1);
		loadCommands();
	};

	const handleResetFilters = () => {
		setStartDate(
			new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
		);
		setEndDate(new Date().toISOString().slice(0, 16));
		setCommandTypeFilter("all");
		setFlaggedFilter("all");
		setPage(0);
		loadCommands(true);
	};

	const handleExport = () => {
		return `commands_${new Date().toISOString().slice(0, 10)}`;
	};

	const isFiltered = commandTypeFilter !== "all" || flaggedFilter !== "all";

	return (
		<Layout>
			<div className="space-y-6">
				{/* Page Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
							Commands Audit History
						</h1>
						<p className="text-sm text-text-secondary mt-1">
							Complete historical record of all operator control signals and
							detector safety verdicts.
						</p>
					</div>
					<DataExportButton
						data={commands}
						filename={handleExport()}
						disabled={isLoading}
					/>
				</div>

				{/* Reworked Filters Card */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-5 transition-colors space-y-4">
					<div className="flex items-center justify-between pb-3 border-b border-border-subtle/60">
						<div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
							<Filter className="w-3.5 h-3.5 text-primary" />
							<span>Filter Audit Trail</span>
						</div>

						{isFiltered && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleResetFilters}
								leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
							>
								Reset Filters
							</Button>
						)}
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
						<div className="lg:col-span-2">
							<DateRangePicker
								startDate={startDate}
								endDate={endDate}
								onStartDateChange={(date) => {
									setStartDate(date);
									setPage(0);
									loadCommands(true);
								}}
								onEndDateChange={(date) => {
									setEndDate(date);
									setPage(0);
									loadCommands(true);
								}}
							/>
						</div>

						<Select
							label="Actuator Type"
							value={commandTypeFilter}
							onChange={(e) => {
								setCommandTypeFilter(e.target.value as CommandType | "all");
								setPage(0);
								loadCommands(true);
							}}
							options={[
								{ value: "all", label: "All Actuators" },
								{ value: "pump", label: "Pump Actuator" },
								{ value: "valve", label: "Drain Valve" },
							]}
						/>

						<Select
							label="Safety Verdict"
							value={flaggedFilter}
							onChange={(e) => {
								setFlaggedFilter(
									e.target.value as "all" | "flagged" | "normal",
								);
								setPage(0);
								loadCommands(true);
							}}
							options={[
								{ value: "all", label: "All Verdicts" },
								{ value: "flagged", label: "Flagged (Unsafe)" },
								{ value: "normal", label: "Benign (Normal)" },
							]}
						/>
					</div>
				</div>

				{/* Commands Table */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 transition-colors">
					<CommandLogTable commands={commands} isLoading={isLoading} />

					{hasMore && commands.length > 0 && (
						<div className="mt-6 text-center">
							<Button
								variant="secondary"
								size="md"
								onClick={handleLoadMore}
								isLoading={isLoading}
							>
								{isLoading ? "Loading..." : "Load Next Page"}
							</Button>
						</div>
					)}
				</div>

				{/* Statistics Summary */}
				{commands.length > 0 && (
					<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 transition-colors">
						<h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-4">
							Log Aggregates & Safety Distribution
						</h3>
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="p-4 rounded-xl bg-surface-2 border border-border-subtle">
								<div className="flex items-center gap-1.5 text-xs text-text-tertiary uppercase font-semibold">
									<Activity className="w-3.5 h-3.5 text-text-secondary" />
									<span>Total Commands</span>
								</div>
								<p className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-1">
									{commands.length}
								</p>
							</div>

							<div className="p-4 rounded-xl bg-critical/10 border border-critical/20">
								<div className="flex items-center gap-1.5 text-xs text-critical uppercase font-semibold">
									<ShieldAlert className="w-3.5 h-3.5 text-critical" />
									<span>Flagged Violations</span>
								</div>
								<p className="text-2xl sm:text-3xl font-extrabold text-critical mt-1">
									{commands.filter((cmd) => cmd.flagged).length}
								</p>
							</div>

							<div className="p-4 rounded-xl bg-surface-2 border border-border-subtle">
								<div className="flex items-center gap-1.5 text-xs text-text-tertiary uppercase font-semibold">
									<CheckCircle2 className="w-3.5 h-3.5 text-primary" />
									<span>Pump Commands</span>
								</div>
								<p className="text-2xl sm:text-3xl font-extrabold text-primary mt-1">
									{commands.filter((cmd) => cmd.command_type === "pump").length}
								</p>
							</div>

							<div className="p-4 rounded-xl bg-surface-2 border border-border-subtle">
								<div className="flex items-center gap-1.5 text-xs text-text-tertiary uppercase font-semibold">
									<CheckCircle2 className="w-3.5 h-3.5 text-text-secondary" />
									<span>Valve Commands</span>
								</div>
								<p className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-1">
									{
										commands.filter((cmd) => cmd.command_type === "valve")
											.length
									}
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
};
