import { useEffect, type FC, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: ReactNode;
	footer?: ReactNode;
	maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Modal: FC<ModalProps> = ({
	isOpen,
	onClose,
	title,
	description,
	children,
	footer,
	maxWidth = "md",
}) => {
	// Close on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const maxWidthClasses = {
		sm: "max-w-sm",
		md: "max-w-md",
		lg: "max-w-lg",
		xl: "max-w-xl",
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
				onClick={onClose}
			/>

			{/* Modal Dialog */}
			<div
				className={`relative w-full ${maxWidthClasses[maxWidth]} bg-surface-1 border border-border-strong/70 rounded-2xl shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150`}
			>
				{/* Header */}
				<div className="flex items-start justify-between p-5 border-b border-border-subtle">
					<div>
						<h3 className="text-base font-semibold text-text-primary">
							{title}
						</h3>
						{description && (
							<p className="text-xs text-text-secondary mt-1">{description}</p>
						)}
					</div>
					<button
						onClick={onClose}
						className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
						aria-label="Close"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Content */}
				<div className="p-5 text-sm text-text-secondary leading-relaxed">
					{children}
				</div>

				{/* Footer */}
				{footer ? (
					<div className="p-4 px-5 bg-surface-2/40 border-t border-border-subtle flex items-center justify-end gap-2.5">
						{footer}
					</div>
				) : (
					<div className="p-4 px-5 bg-surface-2/40 border-t border-border-subtle flex items-center justify-end">
						<Button variant="secondary" size="sm" onClick={onClose}>
							Close
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
