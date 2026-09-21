// SafeCheck-specific types matching backend schema

export type Severity = "info" | "warning" | "critical";
export type RuleTriggered = "sanity_check" | "state_machine" | "replay" | "drift";
export type Confidence = "certain" | "needs_review";
export type CommandType = "pump" | "valve";

// Plant live state from GET /plant/live
export interface PlantLiveState {
  water_level: number;
  pump_state: boolean;
  valve_state: boolean;
  timestamp: string;
}

// Reading from database
export interface Reading {
  id: number;
  timestamp: string;
  water_level: number;
  pump_state: boolean;
  valve_state: boolean;
  source: string;
}

// Command from database
export interface Command {
  id: number;
  timestamp: string;
  command_type: CommandType;
  value: boolean;
  source_id: string;
  flagged: boolean;
}

// Alert from database
export interface Alert {
  id: number;
  timestamp: string;
  severity: Severity;
  rule_triggered: RuleTriggered;
  related_command_id: number | null;
  message: string;
  confidence: Confidence;
}

// Alert summary for feed (from GET /alerts)
export interface AlertOut {
  id: number;
  timestamp: string;
  severity: Severity;
  rule_triggered: RuleTriggered;
  message: string;
  confidence: Confidence;
}

// Alert detail with related command (from GET /alerts/{id})
export interface AlertDetail extends AlertOut {
  related_command?: Command;
}

// Filter types for API calls
export interface AlertFilters {
  severity?: Severity;
  limit?: number;
}

export interface HistoryFilters {
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}
