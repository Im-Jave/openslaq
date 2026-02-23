import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

interface TooltipProps {
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
}

function Tooltip({ content, side = "top", children }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={4}
          className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip, TooltipProvider };
