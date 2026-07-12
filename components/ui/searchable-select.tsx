"use client"

// SearchableSelect — a type-to-search single-select combobox built on the
// existing shadcn Command + Popover primitives (cmdk under the hood). Drop-in
// replacement for a native <select> where the option list can grow long: the
// user types to filter instead of scrolling a raw dropdown. Styled to the
// Ledger design system (gold focus ring, dark surface) so it matches the rest
// of the app. See docs/frontend for the universal-dropdown rollout.

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface SearchableSelectOption {
  value: string
  label: string
  /** Optional secondary line shown under the label (e.g. a date or count). */
  hint?: string
  /** Extra text folded into the type-to-search match beyond the label. */
  keywords?: string[]
  disabled?: boolean
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Placeholder shown inside the search input. */
  searchPlaceholder?: string
  /** Text shown when the filter matches nothing. */
  emptyText?: string
  disabled?: boolean
  className?: string
  /** Width of the popover; defaults to matching the trigger width. */
  contentClassName?: string
  id?: string
  "aria-label"?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  emptyText = "No matches found.",
  disabled = false,
  className,
  contentClassName,
  id,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const selected = React.useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-lg border-white/15 bg-white/[0.04] px-3 text-sm font-normal text-ink hover:bg-white/[0.06] hover:text-ink focus:border-gold/60 focus:ring-2 focus:ring-gold/20",
            !selected && "text-ink-muted",
            className,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-ink-muted" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "w-[--radix-popover-trigger-width] min-w-[12rem] border-white/10 bg-[#14171f] p-0",
          contentClassName,
        )}
      >
        <Command
          className="bg-transparent"
          // cmdk matches on each item's `value`, which we key by the option's
          // unique value so same-named options never collapse. The visible
          // label + any extra keywords carry the actual search text.
          filter={(itemValue, search, keywords) => {
            const haystack = (keywords ?? []).join(" ").toLowerCase()
            return haystack.includes(search.toLowerCase()) ? 1 : 0
          }}
        >
          <CommandInput placeholder={searchPlaceholder} className="text-ink" />
          <CommandList>
            <CommandEmpty className="text-ink-muted">{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.keywords ?? [])]}
                  disabled={option.disabled}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className="cursor-pointer text-ink aria-selected:bg-white/[0.06] aria-selected:text-ink"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-gold",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="truncate text-xs text-ink-muted">{option.hint}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
