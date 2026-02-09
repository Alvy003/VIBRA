import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = React.useState(() => {
    if (typeof window === "undefined") return false
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches
    )
  })

  React.useEffect(() => {
    const check = () => {
      setIsTouch(
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(pointer: coarse)").matches
      )
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  return isTouch
}

const TouchContext = React.createContext(false)

const TooltipProvider = ({ children, ...props }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) => {
  const isTouch = useIsTouchDevice()

  return (
    <TouchContext.Provider value={isTouch}>
      <TooltipPrimitive.Provider {...props}>{children}</TooltipPrimitive.Provider>
    </TouchContext.Provider>
  )
}

const Tooltip = ({ children, ...props }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) => {
  const isTouch = React.useContext(TouchContext)

  if (isTouch) {
    return <>{children}</>
  }

  return <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>
}

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ children, asChild, ...props }, ref) => {
  const isTouch = React.useContext(TouchContext)

  if (isTouch) {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ ref?: React.Ref<HTMLButtonElement> }>, { ref })
    }
    return <>{children}</>
  }

  return (
    <TooltipPrimitive.Trigger ref={ref} asChild={asChild} {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const isTouch = React.useContext(TouchContext)

  if (isTouch) {
    return null
  }

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }