import * as React from "react";

type SelectContextType = {
  value: string;
  setValue: (value: string) => void;
};

const SelectContext = React.createContext<SelectContextType | null>(null);

export const Select = ({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) => {
  const [internalValue, setInternalValue] = React.useState(value ?? "");

  const setValue = (val: string) => {
    setInternalValue(val);
    onValueChange?.(val);
  };

  return (
    <SelectContext.Provider
      value={{ value: internalValue, setValue }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = ({
  children,
  className = "",
}: React.HTMLAttributes<HTMLButtonElement>) => {
  const ctx = React.useContext(SelectContext)!;

  return (
    <button
      type="button"
      className={`w-full border rounded px-3 py-2 text-left ${className}`}
    >
      {children}
    </button>
  );
};

export const SelectValue = ({
  placeholder,
}: {
  placeholder?: string;
}) => {
  const ctx = React.useContext(SelectContext)!;
  return <span>{ctx.value || placeholder}</span>;
};

export const SelectContent = ({
  children,
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`absolute z-50 mt-1 w-full rounded border bg-white shadow ${className}`}
  >
    {children}
  </div>
);

export const SelectItem = ({
  value,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const ctx = React.useContext(SelectContext)!;

  return (
    <div
      onClick={() => ctx.setValue(value)}
      className={`cursor-pointer px-3 py-2 hover:bg-gray-100 ${className}`}
    >
      {children}
    </div>
  );
};
