import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "border-2 border-border text-primary bg-transparent shadow-[3px_3px_0_black] hover:bg-primary hover:text-white active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        filled:
          "border-2 border-border bg-primary text-white shadow-[3px_3px_0_black] hover:bg-primary/90 active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        destructive:
          "border-2 border-border text-destructive bg-transparent shadow-[3px_3px_0_black] hover:bg-destructive hover:text-white active:shadow-none active:translate-x-[3px] active:translate-y-[3px] focus-visible:ring-destructive/20",
        outline:
          "border-2 border-border bg-transparent shadow-[3px_3px_0_black] hover:bg-accent hover:text-accent-foreground active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        secondary:
          "border-2 border-border bg-secondary text-secondary-foreground shadow-[3px_3px_0_black] hover:bg-secondary/80 active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
