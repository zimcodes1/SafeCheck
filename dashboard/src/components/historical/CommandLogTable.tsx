import React from "react";
import type { Command } from "../../types/safecheck.types";
import { formatDateTime, getRelativeTime } from "../../utils/timeUtils";
import { Spinner } from "../ui/Spinner";
import { Badge } from "../ui/Badge";
import { History, CheckCircle2, AlertOctagon } from "lucide-react";

interface CommandLogTableProps {
	commands: Command[];
	isLoading: boolean;
}

export const CommandLogTable: React.FC<CommandLogTableProps> = ({
	commands,
	isLoading,
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
					</tr>
				</thead>
				<tbody className="bg-surface-1 divide-y divide-border-subtle text-sm">
					{commands.map((command) => (
						<tr
							key={command.id}
							className="hover:bg-surface-2/60 transition-colors"
						>
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
										leftIcon={<CheckCircle2 className="w-3 h-3 text-success" />}
									>
										Benign Safe
									</Badge>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
