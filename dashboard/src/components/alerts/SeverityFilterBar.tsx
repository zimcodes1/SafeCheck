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
        return isActive ? "bg-red-500 text-white" : "bg-red-100 text-red-800";
      case "warning":
        return isActive
          ? "bg-amber-500 text-white"
          : "bg-amber-100 text-amber-800";
      case "info":
        return isActive
          ? "bg-gray-500 text-white"
          : "bg-gray-100 text-gray-800";
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
