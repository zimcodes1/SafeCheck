import { create } from "zustand";
import type { PlantLiveState } from "../types/safecheck.types";

interface PlantStore {
  plantState: PlantLiveState | null;
  isConnected: boolean;
  setPlantState: (state: PlantLiveState | null) => void;
  setIsConnected: (connected: boolean) => void;
}

export const usePlantStore = create<PlantStore>((set) => ({
  plantState: null,
  isConnected: false,
  setPlantState: (plantState) => set({ plantState, isConnected: true }),
  setIsConnected: (isConnected) => set({ isConnected }),
}));
