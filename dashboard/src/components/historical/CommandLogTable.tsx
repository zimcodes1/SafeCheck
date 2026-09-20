import React from "react";
import type { Command } from "../../types/safecheck.types";
import { formatDateTime, getRelativeTime } from "../../utils/timeUtils";
import { Spinner } from "../ui/Spinner";
import { Badge } from "../ui/Badge";
import {
	History,
	CheckCircle2,
	AlertOctagon,
	Trash2,
	CheckSquare,
	Square,
	MinusSquare,
} from "lucide-react";

interface CommandLogTableProps {
	commands: Command[];
	isLoading: boolean;
	selectedIds: Set<number>;
	onToggleSelect: (id: number) => void;
	onToggleSelectAll: () => void;
	isAllSelected: boolean;
	isSomeSelected: boolean;
	onDeleteCommand: (id: number) => void;
}

export const CommandLogTable: React.FC<CommandLogTableProps> = ({
	commands,
	isLoading,
	selectedIds,
	onToggleSelect,
	onToggleSelectAll,
	isAllSelected,
	isSomeSelected,
	onDeleteCommand,
}) => {
	if (isLoading && commands.length === 0) {
		return (
			<div className="flex justify-center items-center py-16">
				<Spinner size="lg" label="Loading command audit trail..." />
			</div>
		);
	}

	if (commands.length === 0) {
		return (
			<div className="text-center py-16 px-4">
				<div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-subtle text-text-tertiary mx-auto flex items-center justify-center mb-3">
					<History className="w-6 h-6" />
				</div>
				<h3 className="text-sm font-semibold text-text-primary">
					No Commands Recorded
				</h3>
				<p className="text-xs text-text-secondary mt-1">
					No actuator command signals match the selected time range or filter
					criteria.
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-border-subtle">
				<thead className="bg-surface-2">
					<tr>
						{/* Master Checkbox */}
						<th className="w-12 px-4 py-3.5 text-left">
							<button
								type="button"
								onClick={onToggleSelectAll}
								className="text-text-tertiary hover:text-primary transition-colors cursor-pointer"
								title={isAllSelected ? "Deselect Page" : "Select Page"}
							>
								{isAllSelected ? (
									<CheckSquare className="w-4 h-4 text-primary" />
								) : isSomeSelected ? (
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
							Actuator Target
						</th>
						<th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
							Command State
						</th>
						<th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
							Source Identity
						</th>
						<th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
							Safety Verdict
						</th>
						<th className="px-4 py-3.5 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
							Actions
						</th>
					</tr>
				</thead>
				<tbody className="bg-surface-1 divide-y divide-border-subtle text-sm">
					{commands.map((command) => {
						const isSelected = selectedIds.has(command.id!);
						return (
							<tr
								key={command.id}
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
										onClick={() => onToggleSelect(command.id!)}
										className="text-text-tertiary hover:text-primary transition-colors cursor-pointer"
									>
										{isSelected ? (
											<CheckSquare className="w-4 h-4 text-primary" />
										) : (
											<Square className="w-4 h-4" />
										)}
									</button>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-text-primary">
									<div className="font-medium">
										{getRelativeTime(command.timestamp)}
									</div>
									<div className="text-xs text-text-tertiary font-mono">
										{formatDateTime(command.timestamp)}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<span className="font-semibold text-text-primary uppercase text-xs">
										{command.command_type}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<span className="font-medium text-text-primary">
										{command.value ? "ON / OPEN" : "OFF / CLOSED"}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
										{command.source_id}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									{command.flagged ? (
										<Badge
											variant="critical"
											size="sm"
											dot
											leftIcon={
												<AlertOctagon className="w-3 h-3 text-critical" />
											}
										>
											Flagged Unsafe
										</Badge>
									) : (
										<Badge
											variant="success"
											size="sm"
											leftIcon={
												<CheckCircle2 className="w-3 h-3 text-success" />
											}
										>
											Benign Safe
										</Badge>
									)}
								</td>
								<td className="px-4 py-4 whitespace-nowrap text-right">
									<button
										type="button"
										onClick={() => onDeleteCommand(command.id!)}
										className="p-1.5 rounded-lg text-text-tertiary hover:text-critical hover:bg-critical/10 transition-colors"
										title="Delete command"
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
	);
};
