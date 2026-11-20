import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
};

export default function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  const variantClass = variant === "outline" ? "button-outline" : variant === "ghost" ? "button-ghost" : "button-primary";
  return <button type={type} className={`button ${variantClass} ui-button ${className}`.trim()} {...props} />;
}
