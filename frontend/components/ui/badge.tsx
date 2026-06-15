import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        green:  "bg-accent-muted text-accent ring-accent/20",
        red:    "bg-error-bg text-error ring-error/20",
        yellow: "bg-warning-bg text-warning ring-warning/20",
        blue:   "bg-info-bg text-info ring-info/20",
        muted:  "bg-surface text-muted ring-surface-border",
      },
    },
    defaultVariants: { variant: "muted" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
