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
      <table className="min-w-full divide-y divide-border-subtle">
        <thead className="bg-surface-2">
          <tr>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Timestamp
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Command Type
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Target State
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Source Identity
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-surface-1 divide-y divide-border-subtle">
          {commands.map((command) => (
            <tr key={command.id} className="hover:bg-surface-2/60 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                <div className="font-medium">{getRelativeTime(command.timestamp)}</div>
                <div className="text-xs text-text-tertiary font-mono">
                  {new Date(command.timestamp).toLocaleString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold uppercase text-text-primary">
                {command.command_type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                {command.value ? "ON / OPEN" : "OFF / CLOSED"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {command.source_id}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {command.flagged ? (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
                    FLAGGED (UNSAFE)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30">
                    NORMAL
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
