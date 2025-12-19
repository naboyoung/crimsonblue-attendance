"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // ✅ 덜 어둡게 + 블러 약하게 (원하면 /25~40 사이에서 조절)
      "fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

type SheetSide = "top" | "bottom" | "left" | "right";

const sideClasses: Record<SheetSide, string> = {
  top: "inset-x-0 top-0 border-b animate-in slide-in-from-top",
  bottom: "inset-x-0 bottom-0 border-t animate-in slide-in-from-bottom",
  left: "inset-y-0 left-0 h-full w-3/4 sm:max-w-sm border-r animate-in slide-in-from-left",
  right: "inset-y-0 right-0 h-full w-3/4 sm:max-w-sm border-l animate-in slide-in-from-right",
};

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: SheetSide;
  /** ✅ 특정 시트에서만 overlay 톤 바꾸고 싶을 때 */
  overlayClassName?: string;
  /** ✅ bottom일 때 드래그 핸들 보여줄지 */
  showHandle?: boolean;
};

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      side = "right",
      className,
      children,
      overlayClassName,
      showHandle,
      ...props
    },
    ref
  ) => {
    const shouldShowHandle = (showHandle ?? true) && side === "bottom";

    return (
      <SheetPortal>
        {/* ✅ Overlay: 시트별 커스텀 가능 */}
        <SheetOverlay className={overlayClassName} />

        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            // ✅ 바텀시트 본체는 불투명 유지
            "fixed z-50 bg-background shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            // ✅ bottom만 둥글게 (다른 방향 시트는 기본값 유지)
            side === "bottom" ? "rounded-t-3xl" : "",
            sideClasses[side],
            className
          )}
          {...props}
        >
          {/* ✅ Drag Handle (표시만, 제스처는 나중에) */}
          {shouldShowHandle ? (
            <div aria-hidden className="pt-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-foreground/20" />
            </div>
          ) : null}

          {children}

        </DialogPrimitive.Content>
      </SheetPortal>
    );
  }
);
SheetContent.displayName = DialogPrimitive.Content.displayName;

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  );
}

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
