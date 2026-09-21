import React from "react";
import { StatusLight } from "./StatusLight";

interface ValveStatusLightProps {
  isOpen: boolean;
}

export const ValveStatusLight: React.FC<ValveStatusLightProps> = ({ isOpen }) => {
  return (
    <StatusLight
      label="Valve"
      isActive={isOpen}
      activeLabel="OPEN"
      inactiveLabel="CLOSED"
    />
  );
};
