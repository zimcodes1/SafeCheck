import type { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, Bell, Component, History } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { StatusIndicator } from "./ui/StatusIndicator";

export const TopBar: FC = () => {
  const location = useLocation();
  const isOnline = true; // This will be updated by the plant store

  const isActive = (path: string) => location.pathname === path;

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
            </div>
            <span className="text-[11px] text-text-secondary hidden sm:inline">
              Industrial Intrusion Detection System
            </span>
          </div>
        </div>

        {/* Tab Navigation & Status Badge */}
        <div className="flex items-center gap-3 sm:gap-6">
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
              <span className="hidden sm:inline">Live Plant</span>
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
              <span className="hidden sm:inline">Alert Feed</span>
            </Link>
            <Link
              to="/history/commands"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                isActive("/history/commands") || isActive("/history/readings")
                  ? "bg-surface-1 text-primary shadow-xs font-semibold"
                  : "hover:text-text-primary"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </Link>
            <Link
              to="/demo"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                isActive("/demo")
                  ? "bg-surface-1 text-primary shadow-xs font-semibold"
                  : "hover:text-text-primary"
              }`}
            >
              <Component className="w-3.5 h-3.5" />
              <span>Components Demo</span>
            </Link>
          </nav>

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
