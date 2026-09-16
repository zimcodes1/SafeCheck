import React, { useState, useEffect, useCallback } from "react";
import { safecheckAPI } from "../../api/safecheck.api";
import type { Reading } from "../../types/safecheck.types";
import { Layout } from "../../components/layout/Layout";
import { DateRangePicker, DataExportButton } from "../../components/historical";
import { Spinner } from "../../components/common/Spinner";
import { getRelativeTime, formatDateTime } from "../../utils/timeUtils";

export const ReadingsHistory: React.FC = () => {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 16));
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadReadings = useCallback(
    async (resetPage = false) => {
      setIsLoading(true);
      try {
        const currentPage = resetPage ? 0 : page;
        const data = await safecheckAPI.getReadingsHistory({
          start: startDate || undefined,
          end: endDate || undefined,
          limit: 50,
          offset: currentPage * 50,
        });

        if (resetPage) {
          setReadings(data);
          setPage(0);
        } else {
          setReadings((prev) => [...prev, ...data]);
        }

        setHasMore(data.length === 50);
      } catch (error) {
        console.error("Failed to load readings:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [startDate, endDate, page],
  );

  useEffect(() => {
    loadReadings(true);
  }, [loadReadings]);

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
    loadReadings();
  };

  const handleExport = () => {
    const filename = `readings_${new Date().toISOString().slice(0, 10)}`;
    return filename;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Readings History</h1>
          <DataExportButton
            data={readings}
            filename={handleExport()}
            disabled={isLoading}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(date) => {
              setStartDate(date);
              setPage(0);
            }}
            onEndDateChange={(date) => {
              setEndDate(date);
              setPage(0);
            }}
          />
        </div>

        {/* Readings Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {isLoading && readings.length === 0 ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : readings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No readings found in the selected time range
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Water Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pump State
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valve State
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {readings.map((reading) => (
                      <tr key={reading.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{getRelativeTime(reading.timestamp)}</div>
                          <div className="text-xs text-gray-500">
                            {formatDateTime(reading.timestamp)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {reading.water_level.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {reading.pump_state ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              ON
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              OFF
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {reading.valve_state ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              OPEN
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              CLOSED
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {reading.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasMore && (
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
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
