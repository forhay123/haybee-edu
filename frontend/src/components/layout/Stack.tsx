import React from "react";

interface StackProps {
  direction?: "row" | "col";
  gap?: number;
  children: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({ direction = "col", gap = 2, children }) => (
  <div className={`flex flex-${direction} gap-${gap}`}>{children}</div>
);
