import React from "react";
import classNames from "classnames";

interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = "primary",
  onClick,
}) => {
  const baseClasses =
    "px-4 py-2 font-semibold rounded transition-colors duration-200";
  const styles = classNames(baseClasses, {
    "bg-blue-600 text-white hover:bg-blue-700": variant === "primary",
    "bg-gray-200 text-gray-800 hover:bg-gray-300": variant === "secondary",
  });

  return (
    <button className={styles} onClick={onClick}>
      {label}
    </button>
  );
};

