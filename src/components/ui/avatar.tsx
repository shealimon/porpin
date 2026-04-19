/** Basic pattern: `Avatar` → `AvatarImage` + `AvatarFallback`; use `src=""` when there is no photo. */
import type { ComponentProps } from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full border border-transparent bg-muted text-muted-foreground",
  {
    variants: {
      size: {
        default: "size-10 text-sm",
        sm: "size-8 text-xs",
        lg: "size-12 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
)

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full rounded-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted font-semibold",
        className,
      )}
      {...props}
    />
  )
}

/** Status / notification dot; place inside a `relative` container sized to the avatar (or use `AvatarWithBadge`). */
function AvatarBadge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "pointer-events-none absolute z-20 box-border size-3 min-h-3 min-w-3 rounded-full border-2 border-white bg-brand-500 shadow-md",
        "right-0 top-0 -translate-y-1/3 translate-x-1/3",
        "dark:border-zinc-900 dark:bg-brand-600 dark:shadow-black/30",
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarBadge, avatarVariants }
