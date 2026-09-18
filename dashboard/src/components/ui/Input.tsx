import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	helperText?: string;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			label,
			error,
			helperText,
			leftIcon,
			rightIcon,
			className = "",
			disabled,
			...props
		},
		ref,
	) => {
		return (
			<div className="w-full flex flex-col gap-1.5">
				{label && (
					<label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
						{label}
						{props.required && <span className="text-critical ml-1">*</span>}
					</label>
				)}
				<div className="relative flex items-center">
					{leftIcon && (
						<div className="absolute left-3 flex items-center pointer-events-none text-text-tertiary">
							{leftIcon}
						</div>
					)}
					<input
						ref={ref}
						disabled={disabled}
						className={`
              w-full bg-surface-2 border border-border-subtle rounded-xl text-text-primary text-sm
              placeholder:text-text-tertiary
              px-3.5 py-2 transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftIcon ? "pl-9" : ""}
              ${rightIcon ? "pr-9" : ""}
              ${error ? "border-critical focus:ring-critical/40 focus:border-critical" : ""}
              ${className}
            `}
						{...props}
					/>
					{rightIcon && (
						<div className="absolute right-3 flex items-center pointer-events-none text-text-tertiary">
							{rightIcon}
						</div>
					)}
				</div>
				{error && <p className="text-xs text-critical font-medium">{error}</p>}
				{helperText && !error && (
					<p className="text-xs text-text-tertiary">{helperText}</p>
				)}
			</div>
		);
	},
);

Input.displayName = "Input";
