import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "group relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    {/* Track */}
    <SliderPrimitive.Track
      className={cn(
        // horizontal
        "relative h-[4.8px] lg:h-[3.5px] w-full grow overflow-hidden rounded-full bg-white/25",
        // vertical support
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-[3px]"
      )}
    >
      {/* Played range */}
      <SliderPrimitive.Range
        className={cn(
          "absolute h-full bg-white",
          "data-[orientation=vertical]:w-full data-[orientation=vertical]:h-auto"
        )}
      />
    </SliderPrimitive.Track>

    {/* Thumb (white, subtle shadow) */}
    <SliderPrimitive.Thumb
      className={cn(
        "block h-[10px] w-[10px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)]",
        "transition-transform focus-visible:scale-105 active:scale-110",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
        "disabled:pointer-events-none disabled:opacity-50",
        // vertical alignment feels nicer when slightly centered
        "data-[orientation=vertical]:translate-x-[-5.5px]"
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };