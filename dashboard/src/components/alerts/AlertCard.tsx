import React from "react";
import type { AlertOut } from "../../types/safecheck.types";
import { getSeverityColor } from "../../utils/severityUtils";
import { getRelativeTime } from "../../utils/timeUtils";

interface AlertCardProps {
  alert: AlertOut;
  onClick: () => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onClick }) => {
  const borderStyle =
    alert.confidence === "needs_review"
      ? "border-2 border-dashed"
      : "border-2 border-solid";

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(
        alert.severity,
      )} ${borderStyle}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Severity badge */}
          <div className="flex items-center space-x-2 mb-2">
            <span
              className={`text-xs font-semibold uppercase px-2 py-1 rounded ${getSeverityColor(
                alert.severity,
              )}`}
            >
              {alert.severity}
            </span>
            {alert.confidence === "needs_review" && (
              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded border border-yellow-300">
                Needs Review
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm font-medium mb-2">{alert.message}</p>

          {/* Metadata */}
          <div className="flex items-center space-x-3 text-xs text-gray-600">
            <span>{getRelativeTime(alert.timestamp)}</span>
            <span>•</span>
            <span className="text-gray-500">{alert.rule_triggered}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
