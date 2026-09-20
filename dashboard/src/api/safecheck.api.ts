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

  // Delete a single alert
  deleteAlert: async (alertId: number): Promise<{ status: string; message: string }> => {
    const response = await axiosInstance.delete(`/alerts/${alertId}`);
    return response.data;
  },

  // Delete multiple alerts by IDs
  batchDeleteAlerts: async (ids: number[]): Promise<{ status: string; deleted_count: number }> => {
    const response = await axiosInstance.post("/alerts/batch-delete", { ids });
    return response.data;
  },

  // Delete all alerts (optionally filtered by severity)
  deleteAllAlerts: async (severity?: string): Promise<{ status: string; deleted_count: number }> => {
    const response = await axiosInstance.delete("/alerts", { params: severity ? { severity } : undefined });
    return response.data;
  },

  // Historical readings - get sensor data history
  getReadingsHistory: async (filters?: HistoryFilters): Promise<Reading[]> => {
    const response = await axiosInstance.get("/history/readings", {
      params: filters,
    });
    return response.data;
  },

  deleteReading: async (id: number): Promise<{ status: string; message: string }> => {
    const response = await axiosInstance.delete(`/history/readings/${id}`);
    return response.data;
  },

  batchDeleteReadings: async (ids: number[]): Promise<{ status: string; deleted_count: number }> => {
    const response = await axiosInstance.post("/history/readings/batch-delete", { ids });
    return response.data;
  },

  clearAllReadings: async (): Promise<{ status: string; deleted_count: number }> => {
    const response = await axiosInstance.delete("/history/readings");
    return response.data;
  },

  // Historical commands - get command history
  getCommandsHistory: async (filters?: HistoryFilters): Promise<Command[]> => {
    const response = await axiosInstance.get("/history/commands", {
      params: filters,
    });
    return response.data;
  },

  deleteCommand: async (id: number): Promise<{ status: string; message: string }> => {
    const response = await axiosInstance.delete(`/history/commands/${id}`);
    return response.data;
  },

  batchDeleteCommands: async (ids: number[]): Promise<{ status: string; deleted_count: number }> => {
    const response = await axiosInstance.post("/history/commands/batch-delete", { ids });
    return response.data;
  },

  clearAllCommands: async (): Promise<{ status: string; deleted_count: number }> => {
    const response = await axiosInstance.delete("/history/commands");
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

