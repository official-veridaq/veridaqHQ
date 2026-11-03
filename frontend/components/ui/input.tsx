import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "bg-surface border-surface-border text-foreground flex h-10 w-full rounded-lg border px-4 py-2.5 text-sm",
          "placeholder:text-muted",
          "focus:border-accent focus:ring-accent outline-none transition-colors focus:ring-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
