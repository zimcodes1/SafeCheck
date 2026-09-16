import React from "react";

interface StatusLightProps {
  label: string;
  isActive: boolean;
  activeLabel?: string; // e.g., "ON" or "OPEN"
  inactiveLabel?: string; // e.g., "OFF" or "CLOSED"
}

export const StatusLight: React.FC<StatusLightProps> = ({
  label,
  isActive,
  activeLabel = "ON",
  inactiveLabel = "OFF",
}) => {
  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Status light */}
      <div
        className={`w-16 h-16 rounded-full border-4 shadow-lg transition-all duration-300 ${
          isActive
            ? "bg-green-500 border-green-700 shadow-green-500/50"
            : "bg-gray-400 border-gray-600 shadow-gray-400/50"
        }`}
      />

      {/* Labels */}
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <p
          className={`text-xs font-medium ${
            isActive ? "text-green-600" : "text-gray-500"
          }`}
        >
          {isActive ? activeLabel : inactiveLabel}
        </p>
      </div>
    </div>
  );
};
