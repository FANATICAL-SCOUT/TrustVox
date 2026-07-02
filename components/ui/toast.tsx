"use client"

import * as React from "react"
import { type ToastProps, type ToastActionElement, Provider } from "@radix-ui/react-toast"
import { cva } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = Provider

const toastVariants = cva(
  "group flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full data-[swipe=end]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-right-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastProvider>,
  ToastProps & {
    variant?: "default" | "destructive"
  }
>(({ className, variant, ...props }, ref) => {
  return <ToastProvider ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
})
Toast.displayName = ToastProvider.displayName

const ToastAction = React.forwardRef<React.ElementRef<typeof ToastProvider>, ToastActionElement>(
  ({ className, ...props }, ref) => (
    <ToastProvider
      ref={ref}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
        className,
      )}
      {...props}
    />
  ),
)
ToastAction.displayName = ToastProvider.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastProvider>,
  React.ComponentPropsWithoutRef<typeof ToastProvider>
>(({ className, ...props }, ref) => (
  <ToastProvider.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Close</span>
  </ToastProvider.Close>
))
ToastClose.displayName = ToastProvider.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastProvider>,
  React.ComponentPropsWithoutRef<typeof ToastProvider>
>(({ className, ...props }, ref) => (
  <ToastProvider.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
))
ToastTitle.displayName = ToastProvider.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastProvider>,
  React.ComponentPropsWithoutRef<typeof ToastProvider>
>(({ className, ...props }, ref) => (
  <ToastProvider.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
))
ToastDescription.displayName = ToastProvider.Description.displayName

type ToastViewportProps = React.ComponentPropsWithoutRef<typeof ToastProvider>

const ToastViewport = React.forwardRef<React.ElementRef<typeof ToastProvider>, ToastViewportProps>(
  ({ className, ...props }, ref) => (
    <ToastProvider.Viewport
      ref={ref}
      className={cn(
        "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className,
      )}
      {...props}
    />
  ),
)
ToastViewport.displayName = ToastProvider.Viewport.displayName

export { Toast, ToastAction, ToastClose, ToastTitle, ToastDescription, ToastViewport, toastVariants }
