import React from "react";
import { useNavigate } from "react-router-dom";
import type { AlertOut } from "../../types/safecheck.types";
import { Badge } from "../ui/Badge";
import { getRelativeTime } from "../../utils/timeUtils";
import { ShieldCheck, ChevronRight, Clock } from "lucide-react";

interface RecentAlertsStripProps {
	alerts: AlertOut[];
	onAlertClick?: (alertId: number) => void;
}

export const RecentAlertsStrip: React.FC<RecentAlertsStripProps> = ({
	alerts,
	onAlertClick,
}) => {
	const navigate = useNavigate();

	const handleAlertClick = (alertId: number) => {
		if (onAlertClick) {
			onAlertClick(alertId);
		} else {
			navigate(`/alerts?id=${alertId}`);
		}
	};

	if (alerts.length === 0) {
		return (
			<div className="flex items-center justify-center gap-2.5 p-5 rounded-xl bg-surface-2/60 border border-border-subtle text-text-secondary text-sm">
				<ShieldCheck className="w-5 h-5 text-success shrink-0" />
				<span>
					No recent alerts recorded. Continuous telemetry monitoring active and
					normal.
				</span>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
					Recent Security Detections
				</h3>
				<span className="text-xs text-text-tertiary">
					Click alert for forensic breakdown
				</span>
			</div>
			<div className="space-y-2">
				{alerts.slice(0, 5).map((alert) => (
					<div
						key={alert.id}
						onClick={() => handleAlertClick(alert.id)}
						className="p-3.5 rounded-xl bg-surface-1 border border-border-subtle hover:border-primary/50 cursor-pointer hover:shadow-xs transition-all flex items-center justify-between gap-3"
					>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<Badge variant={alert.severity as any} size="sm" dot>
									{alert.severity}
								</Badge>
								{alert.confidence === "needs_review" && (
									<Badge variant="review" isReview size="sm">
										Needs Review
									</Badge>
								)}
								<span className="text-[11px] font-mono text-text-tertiary">
									{alert.rule_triggered}
								</span>
							</div>
							<p className="text-sm font-medium text-text-primary truncate">
								{alert.message}
							</p>
							<div className="flex items-center gap-1.5 text-xs text-text-tertiary mt-0.5">
								<Clock className="w-3 h-3" />
								<span>{getRelativeTime(alert.timestamp)}</span>
							</div>
						</div>
						<ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
					</div>
				))}
			</div>
		</div>
	);
};
