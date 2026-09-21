import type { FC } from "react";

export type IndicatorState =
	| "active"
	| "inactive"
	| "warning"
	| "critical"
	| "offline";

export interface StatusIndicatorProps {
	state: IndicatorState;
	label?: string;
	sublabel?: string;
	pulse?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
}

export const StatusIndicator: FC<StatusIndicatorProps> = ({
	state,
	label,
	sublabel,
	pulse = false,
	size = "md",
	className = "",
}) => {
	const dotColor: Record<IndicatorState, string> = {
		active: "bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]",
		inactive: "bg-text-tertiary",
		warning: "bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]",
		critical: "bg-critical shadow-[0_0_8px_rgba(239,68,68,0.5)]",
		offline: "bg-critical/80",
	};

	const pingColor: Record<IndicatorState, string> = {
		active: "bg-success",
		inactive: "bg-text-tertiary",
		warning: "bg-warning",
		critical: "bg-critical",
		offline: "bg-critical",
	};

	const sizeClasses: Record<
		"sm" | "md" | "lg",
		{ dot: string; ping: string; text: string }
	> = {
		sm: { dot: "w-2 h-2", ping: "w-2 h-2", text: "text-xs" },
		md: { dot: "w-2.5 h-2.5", ping: "w-2.5 h-2.5", text: "text-sm" },
		lg: {
			dot: "w-3.5 h-3.5",
			ping: "w-3.5 h-3.5",
			text: "text-base font-medium",
		},
	};

	const shouldPulse = pulse || state === "critical";

	return (
		<div className={`inline-flex items-center gap-2 select-none ${className}`}>
			<span className="relative flex items-center justify-center shrink-0">
				{shouldPulse && (
					<span
						className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${pingColor[state]}`}
					/>
				)}
				<span
					className={`relative inline-flex rounded-full transition-colors ${sizeClasses[size].dot} ${dotColor[state]}`}
				/>
			</span>
			{(label || sublabel) && (
				<div className="flex flex-col leading-tight">
					{label && (
						<span className={`text-text-primary ${sizeClasses[size].text}`}>
							{label}
						</span>
					)}
					{sublabel && (
						<span className="text-[11px] text-text-secondary">{sublabel}</span>
					)}
				</div>
			)}
		</div>
	);
};
