import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={clsx("fixed inset-0 bg-black/50 z-50", className)}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

const dialogContentVariants = cva(
  "bg-surface rounded-xl shadow-2xl flex flex-col overflow-hidden focus:outline-none",
  {
    variants: {
      size: {
        sm: "w-[360px]",
        md: "w-[480px]",
        lg: "w-[640px]",
      },
      position: {
        center: "",
        top: "",
      },
    },
    defaultVariants: {
      size: "md",
      position: "center",
    },
  },
);

const DialogContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    VariantProps<typeof dialogContentVariants>
>(({ className, size, position, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={clsx(
        "fixed z-50",
        position === "top"
          ? "left-1/2 top-[10vh] -translate-x-1/2"
          : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        dialogContentVariants({ size, position }),
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

const DialogTitle = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={clsx("text-base font-semibold m-0", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={clsx("text-sm text-muted", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  dialogContentVariants,
};
