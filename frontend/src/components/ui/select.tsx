import * as React from "react";

/* =======================
   Types & Context
======================= */
type SelectContextType = {
  value: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
};

const SelectContext = React.createContext<SelectContextType | null>(null);

const useSelectContext = () => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error("Select components must be used inside <Select>");
  }
  return ctx;
};

/* =======================
   Select (Provider)
======================= */
export const Select = ({
  value,
  defaultValue = "",
  onValueChange,
  disabled = false,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const setValue = (val: string) => {
    if (disabled) return;

    if (!isControlled) {
      setInternalValue(val);
    }
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        setValue,
        open,
        setOpen,
        disabled,
      }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

/* =======================
   SelectTrigger
======================= */
export const SelectTrigger = ({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const ctx = useSelectContext();

  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      disabled={ctx.disabled}
      onClick={() => {
        if (!ctx.disabled) {
          ctx.setOpen(!ctx.open);
        }
      }}
      className={`w-full border rounded px-3 py-2 text-left flex items-center justify-between
        ${ctx.disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}`}
      {...props}
    >
      {children}
      <span className="ml-2">▾</span>
    </button>
  );
};

/* =======================
   SelectValue
======================= */
export const SelectValue = ({
  placeholder,
}: {
  placeholder?: string;
}) => {
  const ctx = useSelectContext();
  return <span>{ctx.value || placeholder}</span>;
};

/* =======================
   SelectContent
======================= */
export const SelectContent = ({
  children,
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) => {
  const ctx = useSelectContext();
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!ctx.open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        ctx.setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [ctx]);

  if (!ctx.open) return null;

  return (
    <div
      ref={ref}
      role="listbox"
      className={`absolute z-50 mt-1 w-full rounded border bg-white shadow ${className}`}
    >
      {children}
    </div>
  );
};

/* =======================
   SelectItem
======================= */
export const SelectItem = ({
  value,
  children,
  className = "",
  disabled = false,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) => {
  const ctx = useSelectContext();
  const isSelected = ctx.value === value;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled && !ctx.disabled) {
          ctx.setValue(value);
        }
      }}
      onKeyDown={(e) => {
        if (!disabled && e.key === "Enter") {
          ctx.setValue(value);
        }
      }}
      className={`px-3 py-2 select-none
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-gray-50"
        }
        ${isSelected ? "bg-gray-100 font-medium" : ""}
        ${className}`}
    >
      {children}
    </div>
  );
};
