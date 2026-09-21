// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Telemetry & Detector Domain Types
export type SeverityLevel = 'info' | 'warning' | 'critical';
export type DetectorRule = 'sanity_check' | 'state_machine' | 'replay' | 'drift';
export type ConfidenceLevel = 'certain' | 'needs_review';
export type CommandType = 'pump' | 'valve';

// Telemetry: GET /plant/live
export interface PlantLiveResponse {
  water_level: number;
  pump_state: boolean;
  valve_state: boolean;
  timestamp: string;
}

// Alert Feed Item: GET /alerts
export interface AlertOut {
  id: number;
  timestamp: string;
  severity: SeverityLevel;
  rule_triggered: DetectorRule;
  related_command_id: number | null;
  message: string;
  confidence: ConfidenceLevel;
}

// Command Details
export interface CommandOut {
  id: number;
  timestamp: string;
  command_type: CommandType;
  value: boolean;
  source_id: string;
  flagged: boolean;
}

// Detailed Alert: GET /alerts/{id}
export interface AlertDetail extends AlertOut {
  related_command: CommandOut | null;
}

// Historical Reading: GET /history/readings
export interface ReadingOut {
  id: number;
  timestamp: string;
  water_level: number;
  pump_state: boolean;
  valve_state: boolean;
  source: string;
}

