import React from "react";
import { exportToCSV, exportToJSON } from "../../utils/exportUtils";
import type { Reading, Command } from "../../types/safecheck.types";
import { Button } from "../ui/Button";
import { FileSpreadsheet, FileCode } from "lucide-react";

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

	const isButtonDisabled = disabled || data.length === 0;

	return (
		<div className="flex items-center gap-2">
			<Button
				variant="secondary"
				size="sm"
				onClick={handleExportCSV}
				disabled={isButtonDisabled}
				leftIcon={<FileSpreadsheet className="w-4 h-4 text-primary" />}
			>
				Export CSV
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={handleExportJSON}
				disabled={isButtonDisabled}
				leftIcon={<FileCode className="w-4 h-4" />}
			>
				Export JSON
			</Button>
		</div>
	);
};
