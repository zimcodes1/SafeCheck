import type { Severity } from "../types/safecheck.types";

export const getSeverityColor = (severity: Severity | string): string => {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "bg-critical/15 text-critical border-critical/30";
    case "warning":
      return "bg-warning/15 text-warning border-warning/30";
    case "info":
      return "bg-info/15 text-info border-info/30";
    default:
      return "bg-surface-2 text-text-secondary border-border-subtle";
  }
};

export const getSeverityColorClass = (severity: Severity | string): string => {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "text-critical";
    case "warning":
      return "text-warning";
    case "info":
      return "text-info";
    default:
      return "text-text-secondary";
  }
};
