import type { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, Bell, History, Database } from "lucide-react";
import { StatusIndicator } from "./ui/StatusIndicator";
import { usePlantStore } from "../store/plantStore";

export const TopBar: FC = () => {
	const location = useLocation();
	const { isConnected } = usePlantStore();

	const isActive = (path: string) => location.pathname === path;

	return (
		<header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface-1/90 backdrop-blur-md transition-colors">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
				{/* Brand / Logo */}
				<Link to="/live" className="flex items-center gap-3 group">
					<div className="w-9 h-9 overflow-hidden rounded-xl border-2 border-primary/30 flex items-center justify-center text-primary shadow-xs group-hover:border-primary transition-colors">
						<img
							src="/logo.png"
							alt="logo"
							className="w-full h-full object-cover"
							onError={(e) => {
								// fallback if image not found
								(e.target as HTMLElement).style.display = "none";
							}}
						/>
					</div>
					<div className="flex flex-col">
						<div className="flex items-center gap-2">
							<span className="font-bold text-base text-text-primary tracking-tight">
								SafeCheck
							</span>
						</div>
						<span className="text-[11px] text-text-secondary hidden sm:inline">
							Command Safety Monitor
						</span>
					</div>
				</Link>

				{/* Tab Navigation & Status Badge */}
				<div className="flex items-center gap-2 sm:gap-4">
					{/* Navigation Tabs */}
					<nav className="flex items-center p-1 bg-surface-2 rounded-xl border border-border-subtle text-text-secondary text-xs font-medium">
						<Link
							to="/live"
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
								isActive("/live")
									? "bg-surface-1 text-primary shadow-xs font-semibold"
									: "hover:text-text-primary"
							}`}
						>
							<Activity className="w-3.5 h-3.5" />
							<span>Live Plant</span>
						</Link>
						<Link
							to="/alerts"
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
								isActive("/alerts")
									? "bg-surface-1 text-primary shadow-xs font-semibold"
									: "hover:text-text-primary"
							}`}
						>
							<Bell className="w-3.5 h-3.5" />
							<span>Alerts</span>
						</Link>
						<Link
							to="/history/readings"
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
								isActive("/history/readings")
									? "bg-surface-1 text-primary shadow-xs font-semibold"
									: "hover:text-text-primary"
							}`}
						>
							<Database className="w-3.5 h-3.5" />
							<span className="hidden md:inline">Readings</span>
						</Link>
						<Link
							to="/history/commands"
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
								isActive("/history/commands")
									? "bg-surface-1 text-primary shadow-xs font-semibold"
									: "hover:text-text-primary"
							}`}
						>
							<History className="w-3.5 h-3.5" />
							<span className="hidden md:inline">Commands</span>
						</Link>
					</nav>

					{/* Connection Status Indicator */}
					<div className="flex items-center px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-xs">
						<StatusIndicator
							state={isConnected ? "active" : "offline"}
							size="sm"
							label={isConnected ? "ONLINE" : "DISCONNECTED"}
						/>
					</div>
				</div>
			</div>
		</header>
	);
};
