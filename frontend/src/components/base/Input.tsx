import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, id, ...props }) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-secondary-700">
        {label}
      </label>
    )}
    <input
      id={id}
      className="border border-secondary-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
      {...props}
    />
  </div>
);
