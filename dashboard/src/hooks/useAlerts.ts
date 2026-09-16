import { useState, useEffect, useCallback } from "react";
import { safecheckAPI } from "../api/safecheck.api";
import type { AlertOut, AlertDetail, Severity } from "../types/safecheck.types";

interface UseAlertsOptions {
  enabled?: boolean;
  interval?: number; // polling interval in milliseconds, default 5000ms
  severityFilters?: Severity[];
  limit?: number;
}

export const useAlerts = (options: UseAlertsOptions = {}) => {
  const {
    enabled = true,
    interval = 5000,
    severityFilters = ["info", "warning", "critical"],
    limit = 100,
  } = options;

  const [alerts, setAlerts] = useState<AlertOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!enabled) return;

    try {
      // Always fetch all alerts and filter client-side for flexibility
      const data = await safecheckAPI.getAlerts({ limit });

      // Filter client-side based on severity filters
      const filteredData =
        severityFilters.length > 0
          ? data.filter((alert) => severityFilters.includes(alert.severity))
          : data;

      setAlerts(filteredData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      setError("Failed to fetch alerts");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, severityFilters, limit]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchAlerts();

    // Set up polling
    const pollInterval = setInterval(fetchAlerts, interval);

    return () => {
      clearInterval(pollInterval);
    };
  }, [enabled, interval, fetchAlerts]);

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
