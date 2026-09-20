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
		<div className="flex flex-col items-center space-y-2.5 select-none">
			{/* Industrial status light */}
			<div
				className={`w-14 h-14 rounded-full border-4 transition-all duration-300 flex items-center justify-center ${
					isActive
						? "bg-success border-success/80 shadow-[0_0_20px_rgba(34,197,94,0.4)]"
						: "bg-surface-2 border-border-strong opacity-75"
				}`}
			>
				<div
					className={`w-4 h-4 rounded-full ${
						isActive ? "bg-white/90 shadow-xs" : "bg-text-tertiary/40"
					}`}
				/>
			</div>

			{/* Labels */}
			<div className="text-center">
				<p className="text-xs font-bold text-text-primary uppercase tracking-wider">
					{label}
				</p>
				<p
					className={`text-xs font-semibold mt-0.5 ${
						isActive ? "text-success" : "text-text-tertiary"
					}`}
				>
					{isActive ? activeLabel : inactiveLabel}
				</p>
			</div>
		</div>
	);
};
