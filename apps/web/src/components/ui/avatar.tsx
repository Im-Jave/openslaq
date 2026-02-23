import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const avatarVariants = cva(
  "inline-flex items-center justify-center overflow-hidden shrink-0",
  {
    variants: {
      size: {
        sm: "w-6 h-6 text-xs",
        md: "w-9 h-9 text-sm",
        lg: "w-12 h-12 text-base",
      },
      shape: {
        rounded: "rounded-lg",
        circle: "rounded-full",
      },
    },
    defaultVariants: {
      size: "md",
      shape: "rounded",
    },
  },
);

interface AvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
}

function Avatar({ src, alt, fallback, size, shape, className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={clsx(avatarVariants({ size, shape }), className)}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={alt ?? ""}
          className="w-full h-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback className="w-full h-full flex items-center justify-center bg-avatar-fallback-bg font-semibold text-avatar-fallback-text">
        {fallback.charAt(0).toUpperCase()}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export { Avatar, avatarVariants };
export type { AvatarProps };
