import React from "react";
import { exportToCSV, exportToJSON } from "../../utils/exportUtils";
import type { Reading, Command } from "../../types/safecheck.types";

interface DataExportButtonProps {
  data: Reading[] | Command[];
  filename: string;
  disabled?: boolean;
}

export const DataExportButton: React.FC<DataExportButtonProps> = ({
  data,
  filename,
  disabled = false,
}) => {
  const handleExportCSV = () => {
    exportToCSV(data, filename);
  };

  const handleExportJSON = () => {
    exportToJSON(data, filename);
  };

  return (
    <div className="flex space-x-2">
      <button
        onClick={handleExportCSV}
        disabled={disabled || data.length === 0}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Export CSV
      </button>
      <button
        onClick={handleExportJSON}
        disabled={disabled || data.length === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Export JSON
      </button>
    </div>
  );
};
