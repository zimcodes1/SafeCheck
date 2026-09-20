import React from "react";
import type { AlertOut } from "../../types/safecheck.types";
import { Badge } from "../ui/Badge";
import { getRelativeTime } from "../../utils/timeUtils";
import { useAlertStore } from "../../store/alertStore";
import {
	AlertOctagon,
	AlertTriangle,
	Info,
	Clock,
	ChevronRight,
} from "lucide-react";

interface AlertCardProps {
	alert: AlertOut;
	onClick: () => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onClick }) => {
	const { isAlertRead } = useAlertStore();
	const isRead = isAlertRead(alert.id);
	const isNeedsReview = alert.confidence === "needs_review";

	const getSeverityIcon = () => {
		switch (alert.severity) {
			case "critical":
				return <AlertOctagon className="w-3.5 h-3.5 text-critical" />;
			case "warning":
				return <AlertTriangle className="w-3.5 h-3.5 text-warning" />;
			case "info":
			default:
				return <Info className="w-3.5 h-3.5 text-info" />;
		}
	};

	const getCardBorder = () => {
		if (isNeedsReview) {
			return "border-2 border-dashed border-review/50 hover:border-review";
		}
		switch (alert.severity) {
			case "critical":
				return "border border-critical/30 hover:border-critical/70";
			case "warning":
				return "border border-warning/30 hover:border-warning/70";
			case "info":
			default:
				return "border border-border-subtle hover:border-primary/50";
		}
	};

	return (
		<div
			onClick={onClick}
			className={`p-4 rounded-xl bg-surface-1 cursor-pointer hover:shadow-md transition-all duration-150 ${getCardBorder()}`}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 space-y-2">
					{/* Header Badges */}
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant={alert.severity as any}
							size="sm"
							dot
							leftIcon={getSeverityIcon()}
						>
							{alert.severity}
						</Badge>

						{isNeedsReview ? (
							<Badge variant="review" isReview size="sm">
								Needs Review
							</Badge>
						) : (
							<Badge variant="success" size="sm">
								Certain
							</Badge>
						)}

						{!isRead && (
							<Badge
								variant="critical"
								size="sm"
								className="font-bold tracking-wider animate-pulse"
							>
								NEW
							</Badge>
						)}

						<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-2 text-text-tertiary border border-border-subtle">
							{alert.rule_triggered}
						</span>
					</div>

					{/* Alert Plain-Language Message */}
					<p className="text-sm font-medium text-text-primary leading-relaxed">
						{alert.message}
					</p>

					{/* Footer Metadata */}
					<div className="flex items-center gap-3 text-xs text-text-tertiary">
						<span className="flex items-center gap-1">
							<Clock className="w-3 h-3" />
							<span>{getRelativeTime(alert.timestamp)}</span>
						</span>
						<span>•</span>
						<span>Alert ID #{alert.id}</span>
					</div>
				</div>

				<div className="self-center text-text-tertiary hover:text-text-primary p-1">
					<ChevronRight className="w-5 h-5" />
				</div>
			</div>
		</div>
	);
};
