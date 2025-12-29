import React from "react";

const ParentWidget: React.FC = () => {
  return (
    <div className="p-6 bg-card rounded-lg shadow-md border border-border hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold text-card-foreground mb-2">Parent Portal</h3>
      <p className="text-sm text-muted-foreground">Monitor child progress and communicate with teachers.</p>
    </div>
  );
};

export default ParentWidget;
