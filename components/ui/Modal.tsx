"use client";

import { ReactNode, useEffect } from "react";

type ModalProps = {
  children: ReactNode;
  /** Called on Escape (unless disabled) and optional backdrop click */
  onClose: () => void;
  /** When false, Escape does nothing (e.g. while scrobbling) */
  closeOnEscape?: boolean;
  maxWidthClass?: string;
  /** Extra classes on the inner panel */
  panelClassName?: string;
  /** Enter key handler (e.g. confirm selection) */
  onEnter?: () => void;
};

/**
 * Shared modal chrome: backdrop, scroll lock, Escape/Enter.
 * Put your title, body, and buttons inside as children.
 */
export default function Modal({
  children,
  onClose,
  closeOnEscape = true,
  maxWidthClass = "max-w-4xl",
  panelClassName = "",
  onEnter,
}: ModalProps) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      } else if (e.key === "Enter" && onEnter) {
        onEnter();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, closeOnEscape, onEnter]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div
        className={`bg-gray-800 rounded-lg p-6 w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-200 ${maxWidthClass} ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
