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
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Commands History</h1>
            <p className="text-sm text-text-secondary mt-1">Audit log of all reported actuator signals and detector safety verdicts.</p>
          </div>
          <DataExportButton
            data={commands}
            filename={handleExport()}
            disabled={isLoading}
          />
        </div>

        {/* Filters */}
        <div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-5 transition-colors">
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
              <label className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
                Command Type
              </label>
              <select
                value={commandTypeFilter}
                onChange={(e) => {
                  setCommandTypeFilter(e.target.value as CommandType | "all");
                  setPage(0);
                  loadCommands(true);
                }}
                className="px-3.5 py-2 bg-surface-2 border border-border-subtle rounded-xl text-text-primary text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
              >
                <option value="all">All Types</option>
                <option value="pump">Pump</option>
                <option value="valve">Valve</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
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
                className="px-3.5 py-2 bg-surface-2 border border-border-subtle rounded-xl text-text-primary text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
              >
                <option value="all">All Status</option>
                <option value="flagged">Flagged Only</option>
                <option value="normal">Normal Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Commands Table */}
        <div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 transition-colors">
          <CommandLogTable commands={commands} isLoading={isLoading} />

          {hasMore && commands.length > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-6 py-2.5 bg-surface-2 hover:bg-surface-0 border border-border-subtle text-text-primary font-medium rounded-xl disabled:opacity-50 transition-colors shadow-xs"
              >
                {isLoading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>

        {/* Statistics */}
        {commands.length > 0 && (
          <div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-xs p-6 transition-colors">
            <h3 className="text-base font-bold text-text-primary mb-4">Command Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-surface-2 border border-border-subtle">
                <p className="text-3xl font-extrabold text-text-primary">
                  {commands.length}
                </p>
                <p className="text-xs text-text-tertiary uppercase font-semibold mt-1">Total Logs</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">
                  {commands.filter((cmd) => cmd.flagged).length}
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 uppercase font-semibold mt-1">Flagged Violations</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-surface-2 border border-border-subtle">
                <p className="text-3xl font-extrabold text-primary">
                  {commands.filter((cmd) => cmd.command_type === "pump").length}
                </p>
                <p className="text-xs text-text-tertiary uppercase font-semibold mt-1">Pump Commands</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-surface-2 border border-border-subtle">
                <p className="text-3xl font-extrabold text-text-primary">
                  {
                    commands.filter((cmd) => cmd.command_type === "valve")
                      .length
                  }
                </p>
                <p className="text-xs text-text-tertiary uppercase font-semibold mt-1">Valve Commands</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
