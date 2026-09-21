import { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
	value: string;
	label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	label?: string;
	error?: string;
	helperText?: string;
	options: SelectOption[];
	placeholder?: string;
	leftIcon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
	(
		{
			label,
			error,
			helperText,
			options,
			placeholder,
			leftIcon,
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
					<select
						ref={ref}
						disabled={disabled}
						className={`
              w-full appearance-none bg-surface-2 border border-border-subtle rounded-xl text-text-primary text-sm
              px-3.5 py-2 pr-10 transition-all duration-150 cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftIcon ? "pl-9" : ""}
              ${error ? "border-critical focus:ring-critical/40 focus:border-critical" : ""}
              ${className}
            `}
						{...props}
					>
						{placeholder && (
							<option
								value=""
								disabled
								className="bg-surface-1 text-text-tertiary"
							>
								{placeholder}
							</option>
						)}
						{options.map((option) => (
							<option
								key={option.value}
								value={option.value}
								className="bg-surface-1 text-text-primary py-1"
							>
								{option.label}
							</option>
						))}
					</select>
					<div className="absolute right-3 flex items-center pointer-events-none text-text-tertiary">
						<ChevronDown className="w-4 h-4" />
					</div>
				</div>
				{error && <p className="text-xs text-critical font-medium">{error}</p>}
				{helperText && !error && (
					<p className="text-xs text-text-tertiary">{helperText}</p>
				)}
			</div>
		);
	},
);

Select.displayName = "Select";
