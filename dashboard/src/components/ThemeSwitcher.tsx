import type { FC } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export interface ThemeSwitcherProps {
	variant?: "toggle" | "segmented";
	className?: string;
}

export const ThemeSwitcher: FC<ThemeSwitcherProps> = ({
	variant = "toggle",
	className = "",
}) => {
	const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

	if (variant === "segmented") {
		return (
			<div
				className={`inline-flex items-center p-1 bg-surface-2 rounded-lg border border-border-subtle text-text-secondary ${className}`}
			>
				<button
					onClick={() => setTheme("light")}
					className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-all ${
						theme === "light"
							? "bg-surface-1 text-primary shadow-xs font-semibold"
							: "hover:text-text-primary"
					}`}
					title="Light Mode"
				>
					<Sun className="w-3.5 h-3.5" />
					<span>Light</span>
				</button>
				<button
					onClick={() => setTheme("dark")}
					className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-all ${
						theme === "dark"
							? "bg-surface-1 text-primary shadow-xs font-semibold"
							: "hover:text-text-primary"
					}`}
					title="Dark Mode"
				>
					<Moon className="w-3.5 h-3.5" />
					<span>Dark</span>
				</button>
				<button
					onClick={() => setTheme("system")}
					className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-all ${
						theme === "system"
							? "bg-surface-1 text-primary shadow-xs font-semibold"
							: "hover:text-text-primary"
					}`}
					title="System Preference"
				>
					<Laptop className="w-3.5 h-3.5" />
					<span>System</span>
				</button>
			</div>
		);
	}

	return (
		<button
			onClick={toggleTheme}
			className={`relative p-2 rounded-lg bg-surface-2 hover:bg-border-subtle border border-border-subtle text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer ${className}`}
			title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
			aria-label="Toggle theme"
		>
			{resolvedTheme === "dark" ? (
				<Sun className="w-4 h-4 text-warning transition-transform hover:rotate-45" />
			) : (
				<Moon className="w-4 h-4 text-text-secondary transition-transform hover:-rotate-12" />
			)}
		</button>
	);
};
