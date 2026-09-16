import { useSyncExternalStore } from "react";
import type { PlantLiveState } from "../types/safecheck.types";

interface PlantStoreState {
  plantState: PlantLiveState | null;
  isConnected: boolean;
}

let currentState: PlantStoreState = {
  plantState: null,
  isConnected: false,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const plantStore = {
  setPlantState: (plantState: PlantLiveState | null) => {
    currentState = {
      ...currentState,
      plantState,
      isConnected: plantState !== null,
    };
    emitChange();
  },
  setIsConnected: (isConnected: boolean) => {
    currentState = {
      ...currentState,
      isConnected,
    };
    emitChange();
  },
};

export function usePlantStore() {
  const store = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => currentState,
    () => currentState
  );

  return {
    plantState: store.plantState,
    isConnected: store.isConnected,
    setPlantState: plantStore.setPlantState,
    setIsConnected: plantStore.setIsConnected,
  };
}
