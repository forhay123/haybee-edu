import React from "react";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 40 }) => (
  <img
    src={src || "https://via.placeholder.com/40"}
    alt={alt || "User avatar"}
    width={size}
    height={size}
    className="rounded-full object-cover border border-secondary-100"
  />
);
