import React from "react";

export const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="max-w-6xl mx-auto px-4">{children}</div>
);
