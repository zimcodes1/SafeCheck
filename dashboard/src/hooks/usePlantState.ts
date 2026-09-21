import { useState, useEffect, useCallback } from "react";
import { safecheckAPI } from "../api/safecheck.api";
import type { PlantLiveState } from "../types/safecheck.types";
import { usePlantStore } from "../store/plantStore";

interface UsePlantStateOptions {
  enabled?: boolean;
  interval?: number; // polling interval in milliseconds, default 1000ms
}

export const usePlantState = (options: UsePlantStateOptions = {}) => {
  const { enabled = true, interval = 1000 } = options;

  const [plantState, setLocalPlantState] = useState<PlantLiveState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setLocalIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setPlantState: setStorePlantState, setIsConnected: setStoreIsConnected } = usePlantStore();

  const fetchPlantState = useCallback(async () => {
    if (!enabled) return;

    try {
      const data = await safecheckAPI.getPlantLive();
      setLocalPlantState(data);
      setLocalIsConnected(true);
      setStorePlantState(data);
      setError(null);
    } catch (err) {
      setLocalIsConnected(false);
      setStoreIsConnected(false);
      setError("Failed to connect to plant");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, setStorePlantState, setStoreIsConnected]);

  useEffect(() => {
    if (!enabled) return;

    fetchPlantState();
    const pollInterval = setInterval(fetchPlantState, interval);

    return () => {
      clearInterval(pollInterval);
    };
  }, [enabled, interval, fetchPlantState]);

  return {
    plantState,
    isLoading,
    isConnected,
    error,
    refetch: fetchPlantState,
  };
};
