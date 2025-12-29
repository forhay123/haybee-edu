// ============================================================
// dateRangePicker.tsx (NEW - Sprint 4)
// Location: frontend/src/components/ui/dateRangePicker.tsx
// ============================================================

import * as React from "react";

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  label?: string;
}

export const DateRangePicker = ({
  value,
  onChange,
  label = "Date Range",
}: DateRangePickerProps) => {
  const handleChange = (key: keyof DateRange, val: string) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">{label}</label>

      <div className="flex items-center gap-3">
        <input
          type="date"
          value={value.startDate}
          onChange={(e) => handleChange("startDate", e.target.value)}
          className="border rounded-lg p-2 text-sm"
        />

        <span className="text-gray-500">→</span>

        <input
          type="date"
          value={value.endDate}
          onChange={(e) => handleChange("endDate", e.target.value)}
          className="border rounded-lg p-2 text-sm"
        />
      </div>
    </div>
  );
};
