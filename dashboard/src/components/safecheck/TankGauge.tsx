import React from "react";

interface TankGaugeProps {
  waterLevel: number; // 0-100
  dangerThreshold?: number; // default 95
}

export const TankGauge: React.FC<TankGaugeProps> = ({
  waterLevel,
  dangerThreshold = 95,
}) => {
  // Determine color based on water level
  const getColor = () => {
    if (waterLevel >= dangerThreshold) {
      return "bg-red-500 animate-pulse"; // Danger state with pulse
    }
    if (waterLevel >= 85 || waterLevel <= 10) {
      return "bg-amber-500"; // Near danger
    }
    return "bg-blue-500"; // Normal range
  };

  const colorClass = getColor();
  const percentage = Math.min(100, Math.max(0, waterLevel));

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-32 h-64 bg-gray-200 rounded-lg overflow-hidden border-4 border-gray-400">
        {/* Water fill */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${colorClass}`}
          style={{ height: `${percentage}%` }}
        />

        {/* Percentage text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white drop-shadow-lg">
            {percentage.toFixed(1)}%
          </span>
        </div>

        {/* Danger threshold line */}
        <div
          className="absolute left-0 right-0 h-1 bg-red-700 border-t-2 border-red-900"
          style={{ bottom: `${100 - dangerThreshold}%` }}
        />
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">Water Level</p>
        <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
      </div>
    </div>
  );
};
