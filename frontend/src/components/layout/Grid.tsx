import React from "react";

interface GridProps {
  cols?: number;
  gap?: number;
  children: React.ReactNode;
}

export const Grid: React.FC<GridProps> = ({ cols = 3, gap = 4, children }) => (
  <div className={`grid grid-cols-${cols} gap-${gap}`}>{children}</div>
);
