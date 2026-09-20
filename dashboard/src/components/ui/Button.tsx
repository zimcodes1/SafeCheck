import type { ButtonHTMLAttributes, FC, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "outline"
	| "ghost"
	| "danger"
	| "subtle";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	isLoading?: boolean;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
}

export const Button: FC<ButtonProps> = ({
	children,
	variant = "primary",
	size = "md",
	isLoading = false,
	leftIcon,
	rightIcon,
	disabled,
	className = "",
	...props
}) => {
	// Base classes with smooth transitions and focus ring
	const baseClasses =
		"inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-primary/40";

	// Variant mappings using Tailwind theme tokens
	const variantClasses: Record<ButtonVariant, string> = {
		primary:
			"bg-primary text-[var(--surface-0)] hover:bg-primary-hover active:opacity-95 shadow-sm font-semibold",
		secondary:
			"bg-surface-2 text-text-primary hover:bg-border-subtle border border-border-subtle active:opacity-90",
		outline:
			"border border-border-strong text-text-primary hover:border-primary hover:text-primary hover:bg-primary-subtle-bg/30",
		ghost:
			"text-text-secondary hover:text-text-primary hover:bg-surface-2 active:bg-surface-2/80",
		danger:
			"bg-critical text-white hover:opacity-90 active:opacity-95 shadow-sm font-semibold",
		subtle:
			"bg-primary-subtle-bg text-primary border border-primary-subtle-border hover:bg-primary-subtle-bg/80",
	};

	// Size mappings
	const sizeClasses: Record<ButtonSize, string> = {
		sm: "text-xs px-2.5 py-1 rounded-md gap-1.5",
		md: "text-sm px-3.5 py-1.5 rounded-lg gap-2",
		lg: "text-base px-5 py-2.5 rounded-lg gap-2.5",
	};

	return (
		<button
			disabled={disabled || isLoading}
			className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
			{...props}
		>
			{isLoading ? (
				<Loader2 className="w-4 h-4 animate-spin text-current" />
			) : (
				leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
			)}
			<span>{children}</span>
			{!isLoading && rightIcon && (
				<span className="inline-flex shrink-0">{rightIcon}</span>
			)}
		</button>
	);
};
