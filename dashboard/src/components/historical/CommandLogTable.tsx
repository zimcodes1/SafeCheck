import React from "react";
import type { Command } from "../../types/safecheck.types";
import { getRelativeTime } from "../../utils/timeUtils";

interface CommandLogTableProps {
  commands: Command[];
  isLoading: boolean;
}

export const CommandLogTable: React.FC<CommandLogTableProps> = ({
  commands,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (commands.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No commands found in the selected time range
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timestamp
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Command Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Source ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Flagged
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {commands.map((command) => (
            <tr key={command.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>{getRelativeTime(command.timestamp)}</div>
                <div className="text-xs text-gray-500">
                  {new Date(command.timestamp).toLocaleString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {command.command_type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {command.value ? "ON/OPEN" : "OFF/CLOSED"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {command.source_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {command.flagged ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    Flagged
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Normal
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
