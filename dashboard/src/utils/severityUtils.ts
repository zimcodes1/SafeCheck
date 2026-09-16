import type { Severity } from "../types/safecheck.types";

export const getSeverityColor = (severity: Severity | string): string => {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-300";
    case "warning":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "info":
      return "bg-gray-100 text-gray-800 border-gray-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

export const getSeverityColorClass = (severity: Severity | string): string => {
  switch (severity) {
    case "critical":
      return "text-red-600";
    case "warning":
      return "text-amber-600";
    case "info":
      return "text-gray-600";
    default:
      return "text-gray-600";
  }
};
