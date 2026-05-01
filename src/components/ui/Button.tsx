import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger" | "gold" | "teal" | "violet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  gold: "btn-gold",
  teal: "btn-teal",
  violet: "btn-violet",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth = false, className = "", ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={`${variantClass[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...rest}
      />
    );
  },
);
Button.displayName = "Button";
