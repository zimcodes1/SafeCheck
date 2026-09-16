import React from "react";
import { usePlantState } from "../../hooks/usePlantState";
import { useAlerts } from "../../hooks/useAlerts";
import {
  TankGauge,
  PumpStatusLight,
  ValveStatusLight,
  RecentAlertsStrip,
  ScenarioRunner,
} from "../../components/safecheck";
import { Layout } from "../../components/layout/Layout";

export const LiveView: React.FC = () => {
  // Live plant state - polls every 1 second
  const {
    plantState,
    isConnected,
  } = usePlantState({ enabled: true, interval: 1000 });

  // Recent alerts - polls every 5 seconds, limit to 5 most recent
  const { alerts: recentAlerts, refetch: refetchAlerts } = useAlerts({
    enabled: true,
    interval: 5000,
    limit: 5,
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Scenario Injection Bar for Demo */}
        <ScenarioRunner onScenarioRun={refetchAlerts} />

        {/* Offline Warning Banner if Plant is not connected */}
        {!isConnected && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-center">
              <span className="text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-sm font-semibold text-amber-800">
                  Plant Modbus Disconnected or Standby
                </h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Backend could not reach the Modbus server at 127.0.0.1:5020. You can start the plant simulator with <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">python plant/run.py</code>, or use the <strong>Simulate Attack</strong> panel above to exercise the detector.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plant Status Display */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Water Plant Telemetry
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time physical state queried via Modbus input registers (0–2)</p>
            </div>
            {plantState && (
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                Polled {new Date(plantState.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Tank Gauge */}
            <div className="flex justify-center">
              <TankGauge waterLevel={plantState?.water_level ?? 0} />
            </div>

            {/* Actuator Status Lights */}
            <div className="flex justify-center space-x-10">
              <PumpStatusLight isRunning={plantState?.pump_state ?? false} />
              <ValveStatusLight isOpen={plantState?.valve_state ?? false} />
            </div>

            {/* Metrics & Telemetry Card */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Water Level</p>
                <p className="text-2xl font-bold text-slate-900">
                  {plantState ? `${plantState.water_level.toFixed(1)}%` : "N/A"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">Pump Actuator:</span>
                  <p className="font-semibold text-slate-800">
                    {plantState?.pump_state ? "RUNNING" : "STOPPED"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Drain Valve:</span>
                  <p className="font-semibold text-slate-800">
                    {plantState?.valve_state ? "OPEN" : "CLOSED"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts Strip */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <RecentAlertsStrip alerts={recentAlerts} />
        </div>
      </div>
    </Layout>
  );
};
