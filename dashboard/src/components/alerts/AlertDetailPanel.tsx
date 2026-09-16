import React from "react";
import type { AlertDetail } from "../../types/safecheck.types";
import { Button } from "../common/Button";
import { getSeverityColor } from "../../utils/severityUtils";
import { getRelativeTime, formatDateTime } from "../../utils/timeUtils";

interface AlertDetailPanelProps {
  alert: AlertDetail | null;
  onClose: () => void;
}

export const AlertDetailPanel: React.FC<AlertDetailPanelProps> = ({
  alert,
  onClose,
}) => {
  if (!alert) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Alert Details</h2>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Severity and confidence */}
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-lg font-semibold ${getSeverityColor(
                alert.severity as any,
              )}`}
            >
              {alert.severity.toUpperCase()}
            </span>
            {alert.confidence === "needs_review" && (
              <span className="px-3 py-1 rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-300 font-medium">
                Needs Review
              </span>
            )}
          </div>

          {/* Message */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Message
            </h3>
            <p className="text-gray-900">{alert.message}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Timestamp
              </h3>
              <p className="text-gray-900">
                {getRelativeTime(alert.timestamp)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDateTime(alert.timestamp)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Detector Layer
              </h3>
              <p className="text-gray-900">{alert.rule_triggered}</p>
            </div>
          </div>

          {/* Related command */}
          {alert.related_command && (
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Related Command
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Command Type:</span>
                  <span className="text-sm font-medium">
                    {alert.related_command.command_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Value:</span>
                  <span className="text-sm font-medium">
                    {alert.related_command.value ? "ON/OPEN" : "OFF/CLOSED"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Source ID:</span>
                  <span className="text-sm font-medium">
                    {alert.related_command.source_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Flagged:</span>
                  <span
                    className={`text-sm font-medium ${
                      alert.related_command.flagged
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {alert.related_command.flagged ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Timestamp:</span>
                  <span className="text-sm font-medium">
                    {formatDateTime(alert.related_command.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
