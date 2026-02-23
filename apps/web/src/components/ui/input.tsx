import { forwardRef, type InputHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const inputVariants = cva(
  "text-sm focus:outline-none focus:ring-2 focus:ring-slack-blue focus:border-transparent",
  {
    variants: {
      variant: {
        default: "border border-border-strong rounded-lg px-3 py-2 bg-surface text-primary",
        compact: "border border-border-strong rounded text-[13px] px-2.5 py-1.5 bg-surface text-primary",
        flush: "border-none bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(inputVariants({ variant }), className)}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input, inputVariants };
export type { InputProps };
