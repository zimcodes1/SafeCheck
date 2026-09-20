import React from "react";
import { StatusLight } from "./StatusLight";

interface PumpStatusLightProps {
  isRunning: boolean;
}

export const PumpStatusLight: React.FC<PumpStatusLightProps> = ({ isRunning }) => {
  return (
    <StatusLight
      label="Pump"
      isActive={isRunning}
      activeLabel="RUNNING"
      inactiveLabel="STOPPED"
    />
  );
};
