import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { toast } from "sonner";
import {
	Filter,
	RotateCcw,
	ShieldAlert,
	Activity,
	CheckCircle2,
	Clock,
	Trash2,
	X,
	ChevronLeft,
	ChevronRight,
	Info,
} from "lucide-react";
import {
	toLocalDatetimeInputString,
	parseLocalDatetimeToUtcIso,
} from "../../utils/timeUtils";

type TimePreset = "all" | "15m" | "1h" | "24h" | "custom";

export const CommandsHistory: React.FC = () => {
	const [commands, setCommands] = useState<Command[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isBulkDeleting, setIsBulkDeleting] = useState(false);

	// Filters
	const [timePreset, setTimePreset] = useState<TimePreset>("all");
	const [customStartDate, setCustomStartDate] = useState<string>(() =>
		toLocalDatetimeInputString(new Date(Date.now() - 24 * 60 * 60 * 1000)),
	);
	const [customEndDate, setCustomEndDate] = useState<string>(() =>
		toLocalDatetimeInputString(new Date()),
	);
	const [commandTypeFilter, setCommandTypeFilter] = useState<
		CommandType | "all"
	>("all");
	const [flaggedFilter, setFlaggedFilter] = useState<
		"all" | "flagged" | "normal"
	>("all");

	// Multi-selection state
	const [selectedCommandIds, setSelectedCommandIds] = useState<Set<number>>(
		new Set(),
	);

	// Pagination (10 items per page)
	const PAGE_SIZE = 10;
	const [currentPage, setCurrentPage] = useState<number>(1);

	// Data fetching
	const loadCommands = useCallback(async () => {
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

			const data = await safecheckAPI.getCommandsHistory({
				start: startIso,
				end: endIso,
				limit: 100,
				offset: 0,
			});

			setCommands(data);
		} catch (error) {
			console.error("Failed to load commands:", error);
		} finally {
			setIsLoading(false);
		}
	}, [timePreset, customStartDate, customEndDate]);

	// Auto-polling every 3 seconds
	useEffect(() => {
		setIsLoading(true);
		loadCommands();

		const interval = setInterval(loadCommands, 3000);
		return () => clearInterval(interval);
	}, [loadCommands]);

	// Client-side filtering
	const filteredCommands = useMemo(() => {
		return commands.filter((cmd) => {
			if (
				commandTypeFilter !== "all" &&
				cmd.command_type !== commandTypeFilter
			) {
				return false;
			}
			if (flaggedFilter === "flagged" && !cmd.flagged) {
				return false;
			}
			if (flaggedFilter === "normal" && cmd.flagged) {
				return false;
			}
			return true;
		});
	}, [commands, commandTypeFilter, flaggedFilter]);

	// Reset page and selection on filter changes
	useEffect(() => {
		setCurrentPage(1);
		setSelectedCommandIds(new Set());
	}, [
		timePreset,
		customStartDate,
		customEndDate,
		commandTypeFilter,
		flaggedFilter,
	]);

	// Pagination calculations
	const totalPages = Math.max(
		1,
		Math.ceil(filteredCommands.length / PAGE_SIZE),
	);
	const paginatedCommands = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filteredCommands.slice(start, start + PAGE_SIZE);
	}, [filteredCommands, currentPage]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	// Selection helpers
	const isAllPageSelected = useMemo(() => {
		if (paginatedCommands.length === 0) return false;
		return paginatedCommands.every((c) => selectedCommandIds.has(c.id!));
	}, [paginatedCommands, selectedCommandIds]);

	const isSomePageSelected = useMemo(() => {
		return (
			paginatedCommands.some((c) => selectedCommandIds.has(c.id!)) &&
			!isAllPageSelected
		);
	}, [paginatedCommands, selectedCommandIds, isAllPageSelected]);

	const toggleSelectAllPage = () => {
		setSelectedCommandIds((prev) => {
			const next = new Set(prev);
			if (isAllPageSelected) {
				paginatedCommands.forEach((c) => next.delete(c.id!));
			} else {
				paginatedCommands.forEach((c) => next.add(c.id!));
			}
			return next;
		});
	};

	const toggleSelectRow = (id: number) => {
		setSelectedCommandIds((prev) => {
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
		setSelectedCommandIds(new Set(filteredCommands.map((c) => c.id!)));
	};

	const handleClearSelection = () => {
		setSelectedCommandIds(new Set());
	};

	// Deletion actions
	const handleDeleteSingle = async (id: number) => {
		try {
			await safecheckAPI.deleteCommand(id);
			setCommands((prev) => prev.filter((c) => c.id !== id));
			setSelectedCommandIds((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
			toast.success(`Command #${id} deleted`);
		} catch (error) {
			console.error("Failed to delete command:", error);
			toast.error("Failed to delete command");
		}
	};

	const handleDeleteSelected = async () => {
		if (selectedCommandIds.size === 0) return;
		const count = selectedCommandIds.size;
		setIsBulkDeleting(true);
		try {
			await safecheckAPI.batchDeleteCommands(Array.from(selectedCommandIds));
			setCommands((prev) => prev.filter((c) => !selectedCommandIds.has(c.id!)));
			setSelectedCommandIds(new Set());
			toast.success(`Deleted ${count} commands`);
		} catch (error) {
			console.error("Failed to delete commands:", error);
			toast.error("Failed to delete selected commands");
		} finally {
			setIsBulkDeleting(false);
		}
	};

	const handleClearAll = async () => {
		if (
			!window.confirm("Are you sure you want to clear all command history?")
		) {
			return;
		}
		setIsBulkDeleting(true);
		try {
			await safecheckAPI.clearAllCommands();
			setCommands([]);
			setSelectedCommandIds(new Set());
			toast.success("All commands cleared");
		} catch (error) {
			console.error("Failed to clear commands:", error);
			toast.error("Failed to clear commands history");
		} finally {
			setIsBulkDeleting(false);
		}
	};

	const handleResetFilters = () => {
		setTimePreset("all");
		setCommandTypeFilter("all");
		setFlaggedFilter("all");
		setCurrentPage(1);
	};

	const handleExport = () => {
		return `commands_${new Date().toISOString().slice(0, 10)}`;
	};

	const isFiltered =
		timePreset !== "all" ||
		commandTypeFilter !== "all" ||
		flaggedFilter !== "all";

	return (
		<Layout>
			<div className="space-y-6">
				{/* Page Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<div className="flex items-center gap-3">
							<h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
								Commands Audit History
							</h1>
							<span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
								<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
								Live Auto-Polling
							</span>
						</div>
						<p className="text-sm text-text-secondary mt-1">
							Complete historical record of all operator control signals and
							detector safety verdicts.
						</p>
					</div>

					<div className="flex items-center gap-2">
						<DataExportButton
							data={filteredCommands}
							filename={handleExport()}
							disabled={isLoading || filteredCommands.length === 0}
						/>
						{filteredCommands.length > 0 && (
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

				{/* Informational Safety Banner */}
				<div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-text-secondary">
					<Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
					<div>
						<span className="font-semibold text-text-primary">
							About Command Safety Verdicts:{" "}
						</span>
						Commands issued by the legitimate operator comply with the physical
						water level limits (e.g. pump ON when empty, valve OPEN when full)
						and are classified as{" "}
						<span className="font-semibold text-emerald-600 dark:text-emerald-400">
							Benign Safe
						</span>
						. When an attack script transmits an out-of-sequence signal (e.g.
						turning on the pump while full or contradictory actuation),
						SafeCheck intercepts and labels it{" "}
						<span className="font-semibold text-critical">Flagged Unsafe</span>.
					</div>
				</div>

				{/* Filters Card */}
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

					{/* Time Presets */}
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

					{/* Custom Range Picker */}
					{timePreset === "custom" && (
						<div className="pt-2">
							<DateRangePicker
								startDate={customStartDate}
								endDate={customEndDate}
								onStartDateChange={setCustomStartDate}
								onEndDateChange={setCustomEndDate}
							/>
						</div>
					)}

					{/* Dropdown Filters */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
						<Select
							label="Actuator Target"
							value={commandTypeFilter}
							onChange={(e) => {
								setCommandTypeFilter(e.target.value as CommandType | "all");
								setCurrentPage(1);
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
								setCurrentPage(1);
							}}
							options={[
								{ value: "all", label: "All Verdicts" },
								{ value: "flagged", label: "Flagged (Unsafe)" },
								{ value: "normal", label: "Benign (Safe)" },
							]}
						/>
					</div>
				</div>

				{/* Bulk Action Bar */}
				{selectedCommandIds.size > 0 && (
					<div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all">
						<div className="flex items-center gap-3">
							<span className="text-sm font-semibold text-text-primary">
								{selectedCommandIds.size} command
								{selectedCommandIds.size === 1 ? "" : "s"} selected
							</span>
							{selectedCommandIds.size < filteredCommands.length && (
								<button
									type="button"
									onClick={handleSelectAllFiltered}
									className="text-xs text-primary font-medium hover:underline"
								>
									Select all {filteredCommands.length} commands
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
								Delete Selected ({selectedCommandIds.size})
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

				{/* Commands Table Card */}
				<div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 transition-colors">
					<CommandLogTable
						commands={paginatedCommands}
						isLoading={isLoading}
						selectedIds={selectedCommandIds}
						onToggleSelect={toggleSelectRow}
						onToggleSelectAll={toggleSelectAllPage}
						isAllSelected={isAllPageSelected}
						isSomeSelected={isSomePageSelected}
						onDeleteCommand={handleDeleteSingle}
					/>

					{/* Pagination Controls */}
					{filteredCommands.length > 0 && (
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border-subtle/60">
							<div className="text-xs text-text-secondary">
								Showing{" "}
								<span className="font-semibold text-text-primary">
									{(currentPage - 1) * PAGE_SIZE + 1}
								</span>{" "}
								to{" "}
								<span className="font-semibold text-text-primary">
									{Math.min(currentPage * PAGE_SIZE, filteredCommands.length)}
								</span>{" "}
								of{" "}
								<span className="font-semibold text-text-primary">
									{filteredCommands.length}
								</span>{" "}
								commands
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
