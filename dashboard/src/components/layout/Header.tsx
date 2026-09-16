import React from "react";
import { NavLink } from "react-router-dom";
import { ConnectionStatusBadge } from "../safecheck/ConnectionStatusBadge";
import { usePlantStore } from "../../store/plantStore";

export const Header: React.FC = () => {
  const { isConnected } = usePlantStore();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-blue-600 text-white shadow-sm"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Subtitle */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              🛡️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-slate-900 tracking-tight">SafeCheck</span>
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">Track E</span>
              </div>
              <p className="text-xs text-slate-500">ICS Command Safety Monitor</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <NavLink to="/" end className={navLinkClass}>
              Live View
            </NavLink>
            <NavLink to="/alerts" className={navLinkClass}>
              Alerts Feed
            </NavLink>
            <NavLink to="/history/readings" className={navLinkClass}>
              Readings
            </NavLink>
            <NavLink to="/history/commands" className={navLinkClass}>
              Commands
            </NavLink>
          </nav>

          {/* Connection Status Badge */}
          <div className="flex items-center">
            <ConnectionStatusBadge isConnected={isConnected} />
          </div>
        </div>
      </div>
    </header>
  );
};
