import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#f1f5f9] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[rgba(241,245,249,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/60 focus-visible:ring-offset-1 focus-visible:border-[rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
