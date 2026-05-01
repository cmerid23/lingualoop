import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  danger: "btn bg-red-600 text-white hover:bg-red-700",
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
