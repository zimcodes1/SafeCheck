import type { FC, HTMLAttributes, ReactNode } from "react";

export type BadgeVariant =
	| "success"
	| "warning"
	| "critical"
	| "info"
	| "review"
	| "neutral"
	| "outline";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	variant?: BadgeVariant;
	size?: BadgeSize;
	dot?: boolean;
	isReview?: boolean; // Special dashed border for "needs_review" confidence marker
	leftIcon?: ReactNode;
}

export const Badge: FC<BadgeProps> = ({
	children,
	variant = "neutral",
	size = "md",
	dot = false,
	isReview = false,
	leftIcon,
	className = "",
	...props
}) => {
	const baseClasses =
		"inline-flex items-center font-medium tracking-wide transition-colors uppercase select-none";

	const variantClasses: Record<BadgeVariant, string> = {
		success: "bg-success/15 text-success border border-success/30",
		warning: "bg-warning/15 text-warning border border-warning/30",
		critical: "bg-critical/15 text-critical border border-critical/30",
		info: "bg-info/15 text-info border border-info/30",
		review: "bg-review/15 text-review border border-review/40",
		neutral: "bg-surface-2 text-text-secondary border border-border-subtle",
		outline: "bg-transparent text-text-primary border border-border-strong",
	};

	const dotColors: Record<BadgeVariant, string> = {
		success: "bg-success",
		warning: "bg-warning",
		critical: "bg-critical",
		info: "bg-info",
		review: "bg-review",
		neutral: "bg-text-tertiary",
		outline: "bg-text-primary",
	};

	const sizeClasses: Record<BadgeSize, string> = {
		sm: "text-[10px] px-1.5 py-0.5 rounded gap-1 leading-tight",
		md: "text-xs px-2.5 py-0.5 rounded-md gap-1.5 leading-normal",
	};

	// If marked as review/needs_review, render the distinctive dashed border
	const reviewStyle = isReview ? "border-dashed border-review text-review" : "";

	return (
		<span
			className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${reviewStyle} ${className}`}
			{...props}
		>
			{dot && (
				<span
					className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} shrink-0`}
				/>
			)}
			{leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
			<span>{children}</span>
		</span>
	);
};
