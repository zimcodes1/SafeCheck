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
	Trash2,
	CheckCheck,
} from "lucide-react";

interface AlertCardProps {
	alert: AlertOut;
	isSelected?: boolean;
	onToggleSelect?: () => void;
	onClick: () => void;
	onDelete?: (e: React.MouseEvent) => void;
	onMarkRead?: (e: React.MouseEvent) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
	alert,
	isSelected = false,
	onToggleSelect,
	onClick,
	onDelete,
	onMarkRead,
}) => {
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
		if (isSelected) {
			return "border-2 border-primary ring-1 ring-primary/40 bg-primary/5 shadow-xs";
		}
		if (isNeedsReview) {
			return "border-2 border-dashed border-review/50 hover:border-review bg-surface-1";
		}
		switch (alert.severity) {
			case "critical":
				return "border border-critical/30 hover:border-critical/70 bg-surface-1";
			case "warning":
				return "border border-warning/30 hover:border-warning/70 bg-surface-1";
			case "info":
			default:
				return "border border-border-subtle hover:border-primary/50 bg-surface-1";
		}
	};

	return (
		<div
			onClick={onClick}
			className={`p-4 rounded-xl cursor-pointer hover:shadow-md transition-all duration-150 relative group ${getCardBorder()}`}
		>
			<div className="flex items-start gap-3.5">
				{/* Checkbox for Selection */}
				{onToggleSelect && (
					<div
						className="pt-0.5 shrink-0"
						onClick={(e) => {
							e.stopPropagation();
							onToggleSelect();
						}}
					>
						<input
							type="checkbox"
							checked={isSelected}
							onChange={() => {}} // Handled by container onClick with stopPropagation
							className="w-4 h-4 rounded cursor-pointer accent-primary transition-transform hover:scale-105"
							aria-label={`Select alert ${alert.id}`}
						/>
					</div>
				)}

				<div className="flex-1 space-y-2 min-w-0">
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
					<p className="text-sm font-medium text-text-primary leading-relaxed break-words">
						{alert.message}
					</p>

					{/* Footer Metadata */}
					<div className="flex items-center gap-3 text-xs text-text-tertiary">
						<span className="flex items-center gap-1">
							<Clock className="w-3 h-3" />
							<span>{getRelativeTime(alert.timestamp)}</span>
						</span>
						<span>•</span>
						<span className="font-mono">Alert ID #{alert.id}</span>
					</div>
				</div>

				{/* Quick Action Icons & Chevron */}
				<div className="flex items-center gap-1 shrink-0 self-center">
					{!isRead && onMarkRead && (
						<button
							type="button"
							title="Mark as read"
							onClick={(e) => {
								e.stopPropagation();
								onMarkRead(e);
							}}
							className="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-surface-2 transition-colors cursor-pointer"
						>
							<CheckCheck className="w-4 h-4" />
						</button>
					)}

					{onDelete && (
						<button
							type="button"
							title="Delete alert"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(e);
							}}
							className="p-1.5 rounded-lg text-text-tertiary hover:text-critical hover:bg-critical/10 transition-colors cursor-pointer"
						>
							<Trash2 className="w-4 h-4" />
						</button>
					)}

					<div className="text-text-tertiary group-hover:text-text-primary p-1 transition-colors">
						<ChevronRight className="w-5 h-5" />
					</div>
				</div>
			</div>
		</div>
	);
};
