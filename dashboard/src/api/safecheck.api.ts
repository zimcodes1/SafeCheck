import axiosInstance from "./axios.config";
import type {
  PlantLiveState,
  AlertOut,
  AlertDetail,
  Reading,
  Command,
  AlertFilters,
  HistoryFilters,
} from "../types/safecheck.types";

export const safecheckAPI = {
  // Plant live state - polls current plant state
  getPlantLive: async (): Promise<PlantLiveState> => {
    const response = await axiosInstance.get("/plant/live");
    return response.data;
  },

  // Alerts feed - get recent alerts with optional severity filter
  getAlerts: async (filters?: AlertFilters): Promise<AlertOut[]> => {
    const response = await axiosInstance.get("/alerts", { params: filters });
    return response.data;
  },

  // Alert detail - get full alert details including related command
  getAlertDetail: async (alertId: number): Promise<AlertDetail> => {
    const response = await axiosInstance.get(`/alerts/${alertId}`);
    return response.data;
  },

  // Historical readings - get sensor data history
  getReadingsHistory: async (filters?: HistoryFilters): Promise<Reading[]> => {
    const response = await axiosInstance.get("/history/readings", {
      params: filters,
    });
    return response.data;
  },

  // Historical commands - get command history
  getCommandsHistory: async (filters?: HistoryFilters): Promise<Command[]> => {
    const response = await axiosInstance.get("/history/commands", {
      params: filters,
    });
    return response.data;
  },

  // Report command - for attack scripts/legit client to report commands
  reportCommand: async (data: {
    command_type: "pump" | "valve";
    value: boolean;
    source_id: string;
  }): Promise<Command> => {
    const response = await axiosInstance.post("/commands/report", data);
    return response.data;
  },

  // Trigger test simulation scenario
  simulateScenario: async (scenarioName: string): Promise<any> => {
    const response = await axiosInstance.post("/simulate/scenario", {
      scenario_name: scenarioName,
    });
    return response.data;
  },
};

