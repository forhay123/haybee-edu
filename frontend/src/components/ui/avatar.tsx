import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
}

export const Avatar = ({
  src,
  alt = "Avatar",
  size = "md",
  className = "",
  children,
  ...props
}: AvatarProps) => {
  const sizes: Record<string, string> = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
  };

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center bg-gray-200 
        ${sizes[size]} ${className}`}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        children
      )}
    </div>
  );
};

export interface AvatarFallbackProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

export const AvatarFallback = ({
  className = "",
  children,
  ...props
}: AvatarFallbackProps) => {
  return (
    <span
      className={`flex items-center justify-center h-full w-full text-gray-600 
        font-medium ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
