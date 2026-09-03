import type { FC, HTMLAttributes } from "react";

export const Card: FC<HTMLAttributes<HTMLDivElement>> = ({
	children,
	className = "",
	...props
}) => {
	return (
		<div
			className={`bg-surface-1 border border-border-subtle rounded-xl shadow-sm transition-colors ${className}`}
			{...props}
		>
			{children}
		</div>
	);
};

export const CardHeader: FC<HTMLAttributes<HTMLDivElement>> = ({
	children,
	className = "",
	...props
}) => {
	return (
		<div
			className={`p-5 pb-3 border-b border-border-subtle/60 flex items-center justify-between ${className}`}
			{...props}
		>
			{children}
		</div>
	);
};

export const CardTitle: FC<HTMLAttributes<HTMLHeadingElement>> = ({
	children,
	className = "",
	...props
}) => {
	return (
		<h3
			className={`text-base font-semibold text-text-primary tracking-tight ${className}`}
			{...props}
		>
			{children}
		</h3>
	);
};

export const CardDescription: FC<HTMLAttributes<HTMLParagraphElement>> = ({
	children,
	className = "",
	...props
}) => {
	return (
		<p
			className={`text-xs text-text-secondary mt-0.5 leading-relaxed ${className}`}
			{...props}
		>
			{children}
		</p>
	);
};

export const CardContent: FC<HTMLAttributes<HTMLDivElement>> = ({
	children,
	className = "",
	...props
}) => {
	return (
		<div className={`p-5 ${className}`} {...props}>
			{children}
		</div>
	);
};

export const CardFooter: FC<HTMLAttributes<HTMLDivElement>> = ({
	children,
	className = "",
	...props
}) => {
	return (
		<div
			className={`p-4 px-5 bg-surface-2/40 border-t border-border-subtle/60 rounded-b-xl flex items-center justify-between ${className}`}
			{...props}
		>
			{children}
		</div>
	);
};
