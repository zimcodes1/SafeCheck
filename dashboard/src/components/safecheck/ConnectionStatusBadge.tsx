import React from "react";
import { StatusIndicator } from "../ui/StatusIndicator";

interface ConnectionStatusBadgeProps {
	isConnected: boolean;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
	isConnected,
}) => {
	return (
		<div className="flex items-center px-3 py-1.5 rounded-xl bg-surface-2 border border-border-subtle text-xs">
			<StatusIndicator
				state={isConnected ? "active" : "offline"}
				size="sm"
				label={isConnected ? "PLANT CONNECTED" : "PLANT OFFLINE"}
			/>
		</div>
	);
};
