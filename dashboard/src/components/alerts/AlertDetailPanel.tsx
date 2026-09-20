import React from "react";
import type { AlertDetail } from "../../types/safecheck.types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { formatDateTime, getRelativeTime } from "../../utils/timeUtils";
import {
	AlertOctagon,
	AlertTriangle,
	Info,
	Clock,
	Layers,
	Terminal,
	ShieldAlert,
	Trash2,
} from "lucide-react";

interface AlertDetailPanelProps {
	alert: AlertDetail | null;
	isOpen?: boolean;
	onClose: () => void;
	onDelete?: () => void;
}

export const AlertDetailPanel: React.FC<AlertDetailPanelProps> = ({
	alert,
	isOpen,
	onClose,
	onDelete,
}) => {
	const isModalOpen = isOpen !== undefined ? isOpen : !!alert;

	if (!isModalOpen || !alert) {
		return null;
	}

	const isNeedsReview = alert.confidence === "needs_review";

	const getSeverityIcon = () => {
		switch (alert.severity) {
			case "critical":
				return <AlertOctagon className="w-3.5 h-3.5" />;
			case "warning":
				return <AlertTriangle className="w-3.5 h-3.5" />;
			case "info":
			default:
				return <Info className="w-3.5 h-3.5" />;
		}
	};

	return (
		<Modal
			isOpen={isModalOpen}
			onClose={onClose}
			title={`Security Alert Forensics (ID #${alert.id})`}
			description="Physical context correlation and root-cause analysis"
			maxWidth="lg"
			footer={
				<div className="flex items-center justify-between w-full">
					{onDelete ? (
						<Button
							variant="danger"
							size="sm"
							onClick={onDelete}
							leftIcon={<Trash2 className="w-4 h-4" />}
							type="button"
						>
							Delete Alert
						</Button>
					) : (
						<div />
					)}
					<Button variant="secondary" size="sm" onClick={onClose} type="button">
						Close Panel
					</Button>
				</div>
			}
		>
			<div className="space-y-5 text-sm">
				{/* Severity and confidence header badges */}
				<div className="flex flex-wrap items-center gap-2.5 pb-4 border-b border-border-subtle">
					<Badge
						variant={alert.severity as any}
						size="md"
						dot
						leftIcon={getSeverityIcon()}
					>
						{alert.severity} Severity
					</Badge>

					{isNeedsReview ? (
						<Badge variant="review" isReview size="md">
							Needs Review
						</Badge>
					) : (
						<Badge variant="success" size="md">
							Certain
						</Badge>
					)}

					<span className="text-xs font-mono px-2.5 py-1 rounded-md bg-surface-2 text-text-secondary border border-border-subtle">
						Rule: {alert.rule_triggered}
					</span>
				</div>

				{/* Primary Explanation Banner */}
				<div className="p-4 rounded-xl bg-surface-2/60 border border-border-subtle">
					<div className="flex items-start gap-3">
						<ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
						<div className="space-y-1">
							<h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
								Detection Advisor Summary
							</h4>
							<p className="text-sm font-medium text-text-primary leading-relaxed">
								{alert.message}
							</p>
						</div>
					</div>
				</div>

				{/* Metadata Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
					{/* Timestamp */}
					<div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle space-y-1">
						<div className="flex items-center gap-1.5 text-xs text-text-tertiary">
							<Clock className="w-3.5 h-3.5" />
							<span>Detected Timestamp</span>
						</div>
						<div className="text-xs font-mono text-text-primary font-medium">
							{formatDateTime(alert.timestamp)}
						</div>
						<div className="text-[11px] text-text-secondary">
							{getRelativeTime(alert.timestamp)}
						</div>
					</div>

					{/* Layer Attribution */}
					<div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle space-y-1">
						<div className="flex items-center gap-1.5 text-xs text-text-tertiary">
							<Layers className="w-3.5 h-3.5" />
							<span>Security Engine Layer</span>
						</div>
						<div className="text-xs font-mono text-text-primary font-semibold uppercase">
							{alert.rule_triggered}
						</div>
						<div className="text-[11px] text-text-secondary">
							{isNeedsReview
								? "Statistical or sensor-trend anomaly"
								: "Deterministic state/protocol violation"}
						</div>
					</div>
				</div>

				{/* Correlated Command Forensics (if any) */}
				{alert.related_command ? (
					<div className="space-y-2 pt-2">
						<div className="flex items-center gap-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
							<Terminal className="w-3.5 h-3.5 text-primary" />
							<span>Correlated Modbus Command Execution</span>
						</div>

						<div className="p-4 rounded-xl bg-surface-2 border border-border-subtle space-y-2.5 font-mono text-xs">
							<div className="flex justify-between items-center pb-2 border-b border-border-subtle/50">
								<span className="text-text-tertiary">Command ID:</span>
								<span className="text-text-primary font-bold">
									#{alert.related_command.id}
								</span>
							</div>

							<div className="flex justify-between items-center">
								<span className="text-text-tertiary">Actuator Type:</span>
								<span className="text-text-primary uppercase font-bold">
									{alert.related_command.command_type}
								</span>
							</div>

							<div className="flex justify-between items-center">
								<span className="text-text-tertiary">Command Value:</span>
								<span className="px-2 py-0.5 rounded bg-surface-1 border border-border-subtle text-text-primary">
									{String(alert.related_command.value)}
								</span>
							</div>

							<div className="flex justify-between items-center">
								<span className="text-text-tertiary">Command Source Peer:</span>
								<span className="text-primary font-bold">
									{alert.related_command.source_id}
								</span>
							</div>

							<div className="flex justify-between items-center">
								<span className="text-text-tertiary">Received Timestamp:</span>
								<span className="text-text-secondary">
									{formatDateTime(alert.related_command.timestamp)}
								</span>
							</div>
						</div>
					</div>
				) : (
					<div className="p-3.5 rounded-xl bg-surface-2/40 border border-border-subtle text-xs text-text-tertiary">
						<span>
							No specific command frame directly mapped. This alert was
							triggered by cumulative physical telemetry or passive packet
							decoding.
						</span>
					</div>
				)}
			</div>
		</Modal>
	);
};
