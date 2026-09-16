import React from "react";
import type { AlertOut } from "../../types/safecheck.types";
import { AlertCard } from "./AlertCard";
import { Spinner } from "../common/Spinner";

interface AlertFeedProps {
  alerts: AlertOut[];
  isLoading: boolean;
  onAlertClick: (alert: AlertOut) => void;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({
  alerts,
  isLoading,
  onAlertClick,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No alerts found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onClick={() => onAlertClick(alert)}
        />
      ))}
    </div>
  );
};
