import React from "react";
import { Input } from "../ui/Input";
import { Calendar } from "lucide-react";

interface DateRangePickerProps {
	startDate: string;
	endDate: string;
	onStartDateChange: (date: string) => void;
	onEndDateChange: (date: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
			<Input
				label="Start Date / Time"
				type="datetime-local"
				value={startDate}
				onChange={(e) => onStartDateChange(e.target.value)}
				leftIcon={<Calendar className="w-4 h-4" />}
			/>

			<Input
				label="End Date / Time"
				type="datetime-local"
				value={endDate}
				onChange={(e) => onEndDateChange(e.target.value)}
				leftIcon={<Calendar className="w-4 h-4" />}
			/>
		</div>
	);
};
