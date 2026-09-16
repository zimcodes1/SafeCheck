import React, { useState, useEffect, useCallback, useRef } from "react";
import { safecheckAPI } from "../../api/safecheck.api";
import type { Command, CommandType } from "../../types/safecheck.types";
import { Layout } from "../../components/layout/Layout";
import {
  DateRangePicker,
  DataExportButton,
  CommandLogTable,
} from "../../components/historical";

export const CommandsHistory: React.FC = () => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(() =>
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [commandTypeFilter, setCommandTypeFilter] = useState<
    CommandType | "all"
  >("all");
  const [flaggedFilter, setFlaggedFilter] = useState<
    "all" | "flagged" | "normal"
  >("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const hasInitialized = useRef(false);

  const loadCommands = useCallback(
    async (resetPage = false) => {
      setIsLoading(true);
      try {
        const currentPage = resetPage ? 0 : page;
        const data = await safecheckAPI.getCommandsHistory({
          start: startDate || undefined,
          end: endDate || undefined,
          limit: 50,
          offset: currentPage * 50,
        });

        // Apply client-side filters
        let filteredData = data;
        if (commandTypeFilter !== "all") {
          filteredData = filteredData.filter(
            (cmd) => cmd.command_type === commandTypeFilter,
          );
        }
        if (flaggedFilter === "flagged") {
          filteredData = filteredData.filter((cmd) => cmd.flagged === true);
        } else if (flaggedFilter === "normal") {
          filteredData = filteredData.filter((cmd) => cmd.flagged === false);
        }

        if (resetPage) {
          setCommands(filteredData);
          setPage(0);
        } else {
          setCommands((prev) => [...prev, ...filteredData]);
        }

        setHasMore(data.length === 50);
      } catch (error) {
        console.error("Failed to load commands:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [startDate, endDate, commandTypeFilter, flaggedFilter, page],
  );

  // Initial data fetch on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadCommands(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
    loadCommands();
  };

  const handleExport = () => {
    const filename = `commands_${new Date().toISOString().slice(0, 10)}`;
    return filename;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Commands History</h1>
          <DataExportButton
            data={commands}
            filename={handleExport()}
            disabled={isLoading}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(date) => {
                setStartDate(date);
                setPage(0);
                loadCommands(true);
              }}
              onEndDateChange={(date) => {
                setEndDate(date);
                setPage(0);
                loadCommands(true);
              }}
            />

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Command Type
              </label>
              <select
                value={commandTypeFilter}
                onChange={(e) => {
                  setCommandTypeFilter(e.target.value as CommandType | "all");
                  setPage(0);
                  loadCommands(true);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="pump">Pump</option>
                <option value="valve">Valve</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Flagged Status
              </label>
              <select
                value={flaggedFilter}
                onChange={(e) => {
                  setFlaggedFilter(
                    e.target.value as "all" | "flagged" | "normal",
                  );
                  setPage(0);
                  loadCommands(true);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="flagged">Flagged Only</option>
                <option value="normal">Normal Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Commands Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <CommandLogTable commands={commands} isLoading={isLoading} />

          {hasMore && commands.length > 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>

        {/* Statistics */}
        {commands.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {commands.length}
                </p>
                <p className="text-sm text-gray-600">Total Commands</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {commands.filter((cmd) => cmd.flagged).length}
                </p>
                <p className="text-sm text-gray-600">Flagged</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {commands.filter((cmd) => cmd.command_type === "pump").length}
                </p>
                <p className="text-sm text-gray-600">Pump Commands</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {
                    commands.filter((cmd) => cmd.command_type === "valve")
                      .length
                  }
                </p>
                <p className="text-sm text-gray-600">Valve Commands</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
