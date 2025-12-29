import React from "react";

export const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white border border-secondary-100 rounded-xl p-4 shadow-sm">
    {children}
  </div>
);
