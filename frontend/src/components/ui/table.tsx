import * as React from "react";

export const Table = ({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableElement>) => (
  <table
    className={`w-full border-collapse text-sm ${className}`}
    {...props}
  />
);

export const TableHeader = ({
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => <thead {...props} />;

export const TableBody = ({
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...props} />;

export const TableRow = ({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`border-b ${className}`} {...props} />
);

export const TableHead = ({
  className = "",
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={`text-left font-medium p-2 bg-gray-50 border-b ${className}`}
    {...props}
  />
);

export const TableCell = ({
  className = "",
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`p-2 ${className}`} {...props} />
);
