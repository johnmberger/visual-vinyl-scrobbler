"use client";

import { ReactNode } from "react";

type StatusVariant = "error" | "success" | "info";

const VARIANT: Record<StatusVariant, string> = {
  error: "bg-red-900/50 border border-red-600 text-red-200",
  success: "bg-green-900/50 border border-green-600 text-green-200",
  info: "bg-gray-700/50 border border-gray-600 text-gray-300",
};

type StatusBannerProps = {
  variant: StatusVariant;
  title?: string;
  children: ReactNode;
  className?: string;
};

/** Simple status / error / success panel used across Camera, Library, Database. */
export default function StatusBanner({
  variant,
  title,
  children,
  className = "",
}: StatusBannerProps) {
  return (
    <div className={`p-4 rounded-lg ${VARIANT[variant]} ${className}`}>
      {title ? <p className="font-semibold mb-2">{title}</p> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}
