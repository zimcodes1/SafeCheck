import React from "react";
import { useNavigate } from "react-router-dom";
import type { AlertOut } from "../../types/safecheck.types";
import { getSeverityColor } from "../../utils/severityUtils";
import { getRelativeTime } from "../../utils/timeUtils";

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
      <div className="text-center py-6 text-text-tertiary text-sm">
        No recent alerts recorded. All systems normal.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
          Recent Security Detections
        </h3>
        <span className="text-xs text-text-secondary">Click alert for forensic breakdown</span>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert) => (
          <div
            key={alert.id}
            onClick={() => handleAlertClick(alert.id)}
            className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(
              alert.severity,
            )}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{alert.message}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-600">
                    {getRelativeTime(alert.timestamp)}
                  </span>
                  <span className="text-xs text-gray-500">
                    • {alert.rule_triggered}
                  </span>
                </div>
              </div>
              {alert.confidence === "needs_review" && (
                <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded border border-yellow-300">
                  Needs Review
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
