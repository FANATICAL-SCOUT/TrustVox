import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-[#8b5cf680] bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] text-[#f1f5f9] shadow-[0_8px_26px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 hover:brightness-110 before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.18),transparent)] before:opacity-0 before:transition-opacity hover:before:opacity-100 relative overflow-hidden",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[rgba(241,245,249,0.9)] hover:-translate-y-0.5 hover:border-[rgba(139,92,246,0.4)] hover:bg-[rgba(255,255,255,0.08)]",
        secondary:
          "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[rgba(241,245,249,0.9)] hover:-translate-y-0.5 hover:border-[rgba(139,92,246,0.4)] hover:bg-[rgba(255,255,255,0.08)]",
        ghost: "text-[rgba(241,245,249,0.7)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f1f5f9]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
