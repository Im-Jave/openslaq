import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import clsx from "clsx";

const Switch = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={clsx(
      "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
      "data-[state=checked]:bg-slack-blue data-[state=unchecked]:bg-surface-tertiary",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={clsx(
        "block h-4 w-4 rounded-full bg-white transition-transform",
        "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };
