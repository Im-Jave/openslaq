import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-slack-blue text-white hover:bg-slack-blue/90",
        secondary:
          "bg-surface border border-border-strong text-secondary hover:bg-surface-secondary",
        danger: "bg-red-600 text-white hover:bg-red-700",
        ghost: "bg-transparent text-muted hover:bg-surface-tertiary",
        outline:
          "bg-transparent border border-border-strong text-muted hover:bg-surface-tertiary",
      },
      size: {
        sm: "text-xs px-2.5 py-1 rounded",
        md: "text-sm px-4 py-2 rounded-lg",
        lg: "text-base px-8 py-3 rounded-lg font-semibold",
        icon: "p-1.5 rounded",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={clsx(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
