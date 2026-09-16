import React from "react";
import type { Severity } from "../../types/safecheck.types";

interface SeverityFilterBarProps {
  activeFilters: Severity[];
  onFilterToggle: (severity: Severity) => void;
}

export const SeverityFilterBar: React.FC<SeverityFilterBarProps> = ({
  activeFilters,
  onFilterToggle,
}) => {
  const severities: Severity[] = ["info", "warning", "critical"];

  const getSeverityColor = (severity: Severity) => {
    const isActive = activeFilters.includes(severity);
    switch (severity) {
      case "critical":
        return isActive
          ? "bg-red-600 text-white shadow-xs font-semibold"
          : "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20";
      case "warning":
        return isActive
          ? "bg-amber-600 text-white shadow-xs font-semibold"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20";
      case "info":
        return isActive
          ? "bg-slate-600 text-white shadow-xs font-semibold"
          : "bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 border border-slate-500/20";
    }
  };

  return (
    <div className="flex space-x-2">
      {severities.map((severity) => (
        <button
          key={severity}
          onClick={() => onFilterToggle(severity)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${getSeverityColor(
            severity,
          )}`}
        >
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </button>
      ))}
    </div>
  );
};
