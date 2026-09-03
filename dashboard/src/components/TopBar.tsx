import type { FC } from "react";
import { ShieldCheck, Activity, Bell, Component } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { StatusIndicator } from "./ui/StatusIndicator";

export interface TopBarProps {
	activeTab?: string;
	onTabChange?: (tab: string) => void;
	isOnline?: boolean;
}

export const TopBar: FC<TopBarProps> = ({
	activeTab = "demo",
	onTabChange,
	isOnline = true,
}) => {
	return (
		<header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface-1/90 backdrop-blur-md transition-colors">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
				{/* Brand / Logo */}
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 overflow-hidden rounded-xl border-2 border-primary/30 flex items-center justify-center text-primary shadow-xs">
						<img src="/logo.png" alt="logo" />
					</div>
					<div className="flex flex-col">
						<div className="flex items-center gap-2">
							<span className="font-bold text-base text-text-primary tracking-tight">
								SafeCheck
							</span>
							<span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
								Track E
							</span>
						</div>
						<span className="text-[11px] text-text-secondary hidden sm:inline">
							Industrial Intrusion Detection System
						</span>
					</div>
				</div>

				{/* Tab Navigation & Status Badge */}
				<div className="flex items-center gap-3 sm:gap-6">
					{/* Navigation Tabs */}
					{onTabChange && (
						<nav className="flex items-center p-1 bg-surface-2 rounded-xl border border-border-subtle text-text-secondary text-xs font-medium">
							<button
								onClick={() => onTabChange("live")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
									activeTab === "live"
										? "bg-surface-1 text-primary shadow-xs font-semibold"
										: "hover:text-text-primary"
								}`}
							>
								<Activity className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">Live Plant</span>
							</button>
							<button
								onClick={() => onTabChange("alerts")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
									activeTab === "alerts"
										? "bg-surface-1 text-primary shadow-xs font-semibold"
										: "hover:text-text-primary"
								}`}
							>
								<Bell className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">Alert Feed</span>
							</button>
							<button
								onClick={() => onTabChange("demo")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
									activeTab === "demo"
										? "bg-surface-1 text-primary shadow-xs font-semibold"
										: "hover:text-text-primary"
								}`}
							>
								<Component className="w-3.5 h-3.5" />
								<span>Components Demo</span>
							</button>
						</nav>
					)}

					{/* Connection Status Indicator */}
					<div className="hidden md:flex items-center px-2.5 py-1 rounded-lg bg-surface-2 border border-border-subtle text-xs">
						<StatusIndicator
							state={isOnline ? "active" : "offline"}
							size="sm"
							label={isOnline ? "PLANT ONLINE" : "DISCONNECTED"}
						/>
					</div>

					{/* Theme Switcher */}
					<ThemeSwitcher variant="toggle" />
				</div>
			</div>
		</header>
	);
};
