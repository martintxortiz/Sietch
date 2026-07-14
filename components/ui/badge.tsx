import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeColors = {
    gray: "#929AA7",
    orange: "#D47D4D",
    amber: "#C59A43",
    lime: "#82A957",
    teal: "#329C8E",
    cyan: "#3398B0",
    blue: "#4D78BC",
    indigo: "#6269BE",
    violet: "#7B62B7",
    purple: "#935AA3",
    fuchsia: "#A7528B",
    pink: "#B65B78",
} as const;

type BadgeColor = keyof typeof badgeColors

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        solid: "",
      },
      size: {
        sm: "h-5 px-2 text-[11px]",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  color?: BadgeColor
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, color = "gray", size, style, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      style={{
        backgroundColor:
          color === "gray"
            ? "var(--muted)"
            : `color-mix(in srgb, ${badgeColors[color]} 55%, var(--background))`,
        color: "var(--foreground)",
        ...style,
      }}
      {...props}
    />
  )
)

Badge.displayName = "Badge"

export { Badge, badgeColors, badgeVariants }
export type { BadgeColor, BadgeProps }
