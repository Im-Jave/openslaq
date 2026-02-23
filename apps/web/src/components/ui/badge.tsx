import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const badgeVariants = cva("inline-flex items-center font-bold rounded-full", {
  variants: {
    variant: {
      red: "bg-red-600 text-white",
      amber: "bg-amber-100 text-amber-800",
      blue: "bg-blue-100 text-blue-800",
      gray: "bg-surface-tertiary text-secondary",
    },
    size: {
      sm: "text-[11px] px-1.5 py-0.5 min-w-[20px] text-center",
      md: "text-xs px-2 py-0.5 font-medium",
    },
  },
  defaultVariants: {
    variant: "gray",
    size: "md",
  },
});

interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
