/**
 * Shared button Tailwind classes.
 * Prefer these over copy-pasting long class strings in every component.
 */

type ButtonVariant = "primary" | "secondary" | "danger" | "accent";
type ButtonSize = "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/20",
  secondary: "bg-gray-600 hover:bg-gray-500 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  accent: "bg-purple-600 hover:bg-purple-700 text-white",
};

const SIZE: Record<ButtonSize, string> = {
  md: "px-6 py-3",
  lg: "px-6 py-4 text-lg",
};

const BASE =
  "cursor-pointer rounded-lg font-semibold transition-all duration-150 active:scale-[0.98] disabled:bg-gray-600 disabled:cursor-not-allowed disabled:active:scale-100";

export function buttonClass(
  variant: ButtonVariant = "primary",
  options?: { size?: ButtonSize; block?: boolean; className?: string }
): string {
  const size = options?.size ?? "md";
  const block = options?.block ? "flex-1 w-full" : "";
  const extra = options?.className ?? "";
  return [BASE, VARIANT[variant], SIZE[size], block, extra]
    .filter(Boolean)
    .join(" ");
}
