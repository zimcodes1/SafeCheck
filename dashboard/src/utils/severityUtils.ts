import type { Severity } from "../types/safecheck.types";

export const getSeverityColor = (severity: Severity | string): string => {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
    case "warning":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "info":
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
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
