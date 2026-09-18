import React from "react";

interface TankGaugeProps {
	waterLevel: number; // 0-100
	dangerThreshold?: number; // default 95
}

export const TankGauge: React.FC<TankGaugeProps> = ({
	waterLevel,
	dangerThreshold = 95,
}) => {
	// Determine color based on water level
	const getColor = () => {
		if (waterLevel >= dangerThreshold) {
			return "bg-gradient-to-t from-critical to-critical/80 animate-pulse"; // Danger state with pulse
		}
		if (waterLevel >= 85 || waterLevel <= 10) {
			return "bg-gradient-to-t from-warning to-warning/80"; // Near danger
		}
		return "bg-gradient-to-t from-blue-600 to-cyan-500"; // Normal range
	};

	const colorClass = getColor();
	const percentage = Math.min(100, Math.max(0, waterLevel));

	return (
		<div className="flex flex-col items-center space-y-3">
			<div className="relative w-36 h-64 bg-surface-2 rounded-2xl overflow-hidden border-4 border-border-strong shadow-inner transition-colors">
				{/* Level Graduations / Ticks */}
				<div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none z-10 opacity-40">
					<div className="border-b border-text-tertiary text-[9px] font-mono text-text-tertiary">
						100%
					</div>
					<div className="border-b border-text-tertiary text-[9px] font-mono text-text-tertiary">
						75%
					</div>
					<div className="border-b border-text-tertiary text-[9px] font-mono text-text-tertiary">
						50%
					</div>
					<div className="border-b border-text-tertiary text-[9px] font-mono text-text-tertiary">
						25%
					</div>
					<div className="text-[9px] font-mono text-text-tertiary">0%</div>
				</div>

				{/* Water fill */}
				<div
					className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out ${colorClass}`}
					style={{ height: `${percentage}%` }}
				/>

				{/* Danger threshold line (at 95% height) */}
				<div
					className="absolute left-0 right-0 h-0.5 bg-critical border-t border-critical z-20 shadow-xs flex items-center justify-end pr-1"
					style={{ bottom: `${dangerThreshold}%` }}
				>
					<span className="text-[8px] font-mono font-bold text-critical bg-surface-1/90 px-1 rounded shadow-xs">
						LIMIT {dangerThreshold}%
					</span>
				</div>

				{/* Percentage text overlay */}
				<div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
					<span className="text-3xl font-extrabold text-white drop-shadow-md tracking-tight">
						{percentage.toFixed(1)}%
					</span>
					<span className="text-[11px] font-semibold text-white/90 drop-shadow uppercase tracking-wider">
						Fill Level
					</span>
				</div>
			</div>

			{/* Label */}
			<div className="text-center">
				<p className="text-sm font-semibold text-text-primary">Water Tank</p>
				<p className="text-xs text-text-secondary">Capacity: 100.0% Max</p>
			</div>
		</div>
	);
};
