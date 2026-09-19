import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { safecheckAPI } from "../api/safecheck.api";
import type { AlertOut, AlertDetail, Severity } from "../types/safecheck.types";

interface UseAlertsOptions {
  enabled?: boolean;
  interval?: number; // polling interval in milliseconds, default 5000ms
  severityFilters?: Severity[];
  limit?: number;
}

const DEFAULT_SEVERITY_FILTERS: readonly Severity[] = [
  "info",
  "warning",
  "critical",
];

export const useAlerts = (options: UseAlertsOptions = {}) => {
  const {
    enabled = true,
    interval = 5000,
    severityFilters = DEFAULT_SEVERITY_FILTERS,
    limit = 100,
  } = options;

  const [rawAlerts, setRawAlerts] = useState<AlertOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch only depends on stable primitives: enabled and limit.
  // This prevents recreating fetchAlerts on every render when options are passed inline.
  const fetchAlerts = useCallback(async () => {
    if (!enabled) return;

    try {
      const data = await safecheckAPI.getAlerts({ limit });
      if (isMountedRef.current) {
        setRawAlerts(data);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Failed to fetch alerts:", err);
        setError("Failed to fetch alerts");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, limit]);

  // Periodic polling on fixed interval
  useEffect(() => {
    if (!enabled) return;

    // Initial fetch on mount or parameter change
    fetchAlerts();

    // Set up recurring polling interval
    const pollInterval = setInterval(() => {
      fetchAlerts();
    }, interval);

    return () => {
      clearInterval(pollInterval);
    };
  }, [enabled, interval, fetchAlerts]);

  // Client-side filtering derived via useMemo without refetching from network
  const severityKey = severityFilters ? [...severityFilters].sort().join(",") : "all";

  const alerts = useMemo(() => {
    if (!severityFilters || severityFilters.length === 0) {
      return rawAlerts;
    }
    const filterSet = new Set(severityFilters);
    return rawAlerts.filter((alert) => filterSet.has(alert.severity));
  }, [rawAlerts, severityKey]);

  return {
    alerts,
    isLoading,
    error,
    refetch: fetchAlerts,
  };
};

export const useAlertDetail = (alertId: number | null) => {
  const [alertDetail, setAlertDetail] = useState<AlertDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlertDetail = useCallback(async () => {
    if (!alertId) return;

    setIsLoading(true);
    try {
      const data = await safecheckAPI.getAlertDetail(alertId);
      setAlertDetail(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch alert detail:", err);
      setError("Failed to fetch alert detail");
    } finally {
      setIsLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    fetchAlertDetail();
  }, [fetchAlertDetail]);

  return {
    alertDetail,
    isLoading,
    error,
    refetch: fetchAlertDetail,
  };
};
