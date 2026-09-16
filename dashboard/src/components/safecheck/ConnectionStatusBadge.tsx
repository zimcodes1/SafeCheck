import React from "react";

interface ConnectionStatusBadgeProps {
  isConnected: boolean;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  isConnected,
}) => {
  return (
    <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-300">
      <div
        className={`w-3 h-3 rounded-full ${
          isConnected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className="text-sm font-medium text-gray-700">
        {isConnected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
};
