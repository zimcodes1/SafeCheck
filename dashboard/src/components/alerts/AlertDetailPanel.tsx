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
} from "lucide-react";

interface AlertDetailPanelProps {
	alert: AlertDetail | null;
	isOpen?: boolean;
	onClose: () => void;
}

export const AlertDetailPanel: React.FC<AlertDetailPanelProps> = ({
	alert,
	isOpen,
	onClose,
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
				<Button variant="secondary" size="sm" onClick={onClose} type="button">
					Close Panel
				</Button>
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

					<Badge variant="neutral" size="md">
						Layer: {alert.rule_triggered}
					</Badge>
				</div>

				{/* Advisory Message */}
				<div>
					<h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
						<ShieldAlert className="w-3.5 h-3.5 text-primary" />
						<span>Detector Verdict & Explanation</span>
					</h4>
					<div className="p-4 rounded-xl bg-surface-2 border border-border-subtle text-text-primary text-sm leading-relaxed font-normal">
						{alert.message}
					</div>
				</div>

				{/* Metadata Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="p-3.5 rounded-xl bg-surface-2/60 border border-border-subtle">
						<div className="flex items-center gap-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
							<Clock className="w-3.5 h-3.5" />
							<span>Event Timestamp</span>
						</div>
						<p className="text-text-primary font-medium text-sm">
							{getRelativeTime(alert.timestamp)}
						</p>
						<p className="text-xs text-text-secondary font-mono mt-0.5">
							{formatDateTime(alert.timestamp)}
						</p>
					</div>

					<div className="p-3.5 rounded-xl bg-surface-2/60 border border-border-subtle">
						<div className="flex items-center gap-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
							<Layers className="w-3.5 h-3.5" />
							<span>Rule Classification</span>
						</div>
						<p className="text-text-primary font-mono text-sm font-semibold capitalize">
							{alert.rule_triggered.replace("_", " ")}
						</p>
						<p className="text-xs text-text-secondary mt-0.5">
							{isNeedsReview ? "Empirical Anomaly" : "Deterministic Hard Rule"}
						</p>
					</div>
				</div>

				{/* Related Command Details */}
				{alert.related_command ? (
					<div className="p-4 rounded-xl bg-surface-2 border border-border-subtle space-y-3">
						<h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
							<Terminal className="w-3.5 h-3.5 text-primary" />
							<span>Associated Actuator Command</span>
						</h4>

						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
							<div>
								<span className="text-[11px] text-text-secondary block">
									Actuator
								</span>
								<span className="font-semibold text-text-primary uppercase text-sm">
									{alert.related_command.command_type}
								</span>
							</div>
							<div>
								<span className="text-[11px] text-text-secondary block">
									Action
								</span>
								<span className="font-semibold text-text-primary text-sm">
									{alert.related_command.value ? "ON / OPEN" : "OFF / CLOSED"}
								</span>
							</div>
							<div>
								<span className="text-[11px] text-text-secondary block">
									Source Identity
								</span>
								<span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 inline-block mt-0.5">
									{alert.related_command.source_id}
								</span>
							</div>
							<div>
								<span className="text-[11px] text-text-secondary block">
									Verdict
								</span>
								<span
									className={`font-semibold text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${
										alert.related_command.flagged
											? "bg-critical/15 text-critical border border-critical/30"
											: "bg-success/15 text-success border border-success/30"
									}`}
								>
									{alert.related_command.flagged ? "FLAGGED UNSAFE" : "BENIGN"}
								</span>
							</div>
						</div>
					</div>
				) : (
					<div className="p-3.5 rounded-xl bg-surface-2/40 border border-border-subtle/70 text-xs text-text-secondary">
						<strong>Note:</strong> Telemetry-layer detection generated from
						continuous sensor monitoring window (no direct command trigger).
					</div>
				)}
			</div>
		</Modal>
	);
};
