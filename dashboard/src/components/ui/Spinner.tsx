import type { FC } from "react";
import { Loader2 } from "lucide-react";

export interface SpinnerProps {
	size?: "sm" | "md" | "lg" | "xl";
	color?: "primary" | "critical" | "warning" | "muted" | "current";
	className?: string;
	label?: string;
}

export const Spinner: FC<SpinnerProps> = ({
	size = "md",
	color = "primary",
	className = "",
	label,
}) => {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-6 h-6",
		lg: "w-8 h-8",
		xl: "w-12 h-12",
	};

	const colorClasses = {
		primary: "text-primary",
		critical: "text-critical",
		warning: "text-warning",
		muted: "text-text-tertiary",
		current: "text-current",
	};

	return (
		<div
			className={`inline-flex items-center justify-center gap-2 ${className}`}
		>
			<Loader2
				className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
				role="status"
				aria-label="Loading"
			/>
			{label && <span className="text-xs text-text-secondary">{label}</span>}
			<span className="sr-only">Loading...</span>
		</div>
	);
};
