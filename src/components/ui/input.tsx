import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Shared classes for primary form text fields (account settings, auth flows).
 * Use with {@link Input}: `<Input className={fieldControlInputClassName} />`
 */
export const fieldControlInputClassName = cn(
  "h-12 min-h-12 w-full min-w-0 rounded-xl border border-zinc-300 px-3.5 py-2 text-base shadow-sm transition-colors outline-none",
  "bg-white text-zinc-900 placeholder:text-zinc-400",
  "hover:border-zinc-400 focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400/25",
  "dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:placeholder:text-zinc-500",
  "dark:hover:border-zinc-500 dark:focus-visible:ring-zinc-400/20",
)

/** Same height/padding rhythm as login/signup (`authFormFieldCompact`); keeps settings light theme. */
export const fieldControlInputCompactClassName = cn(
  fieldControlInputClassName,
  "box-border h-9 min-h-9 rounded-lg py-0 px-3 text-[0.8125rem] leading-5 sm:text-sm sm:leading-5",
)

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-zinc-300 bg-background px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-zinc-400 focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm dark:border-zinc-600 dark:bg-input/30 dark:hover:border-zinc-500 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
