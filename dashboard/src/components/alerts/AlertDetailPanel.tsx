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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 text-text-primary rounded-2xl shadow-2xl border border-border-subtle max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="p-6 border-b border-border-subtle">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary">Alert Details</h2>
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
              <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium">
                Needs Review
              </span>
            )}
          </div>

          {/* Message */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
              Anomaly Explanation
            </h3>
            <p className="text-text-primary text-base leading-relaxed bg-surface-2 p-3.5 rounded-xl border border-border-subtle">{alert.message}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
                Timestamp
              </h3>
              <p className="text-text-primary font-medium">
                {getRelativeTime(alert.timestamp)}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {formatDateTime(alert.timestamp)}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
                Detector Layer
              </h3>
              <p className="text-text-primary font-mono text-sm">{alert.rule_triggered}</p>
            </div>
          </div>

          {/* Related command */}
          {alert.related_command && (
            <div className="bg-surface-2 rounded-xl p-4 border border-border-subtle">
              <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">
                Associated Control Command
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Target Actuator:</span>
                  <span className="font-semibold text-text-primary uppercase">
                    {alert.related_command.command_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Command Value:</span>
                  <span className="font-semibold text-text-primary">
                    {alert.related_command.value ? "ON / OPEN" : "OFF / CLOSED"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Source Identity:</span>
                  <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {alert.related_command.source_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Flagged by Detector:</span>
                  <span
                    className={`font-semibold ${
                      alert.related_command.flagged
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                  >
                    {alert.related_command.flagged ? "YES (UNSAFE)" : "NO (BENIGN)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Recorded Time:</span>
                  <span className="text-text-tertiary text-xs font-mono">
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
