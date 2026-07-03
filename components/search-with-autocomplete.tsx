"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SearchSuggestionItem {
  id: string
  type: string
  name: string
  subtitle?: string
  category?: string
}

interface SearchWithAutocompleteProps {
  onSelect: (item: { type: string; name: string; id: string }) => void
  items?: SearchSuggestionItem[]
  className?: string
  placeholder?: string
}

const FALLBACK_DATA: SearchSuggestionItem[] = [
  { id: "comp1", type: "company", name: "Tech Innovations Inc." },
  { id: "prod1", type: "product", name: "Quantum Leap Software" },
  { id: "comp2", type: "company", name: "Global Foods Co." },
  { id: "prod2", type: "product", name: "Eco-Friendly Water Bottle" },
  { id: "comp3", type: "company", name: "Fashion Forward Group" },
  { id: "prod3", type: "product", name: "Smart Home Assistant Pro" },
  { id: "comp4", type: "company", name: "Health & Wellness Hub" },
  { id: "prod4", type: "product", name: "Organic Protein Bar" },
  { id: "comp5", type: "company", name: "Travel Adventures Ltd." },
  { id: "prod5", type: "product", name: "Portable Solar Charger" },
  { id: "prod6", type: "product", name: "Raspberry Ice Cream" },
  { id: "prod7", type: "product", name: "Blueberry Muffins" },
  { id: "prod8", type: "product", name: "Vanilla Bean Coffee" },
]

export default function SearchWithAutocomplete({
  onSelect,
  items,
  className,
  placeholder = "Search companies or products...",
}: SearchWithAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const sourceItems = useMemo(() => {
    return items && items.length > 0 ? items : FALLBACK_DATA
  }, [items])

  useEffect(() => {
    if (searchTerm.length > 1) {
      const normalizedTerm = searchTerm.toLowerCase()
      const filtered = sourceItems.filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedTerm) ||
          item.type.toLowerCase().includes(normalizedTerm) ||
          item.subtitle?.toLowerCase().includes(normalizedTerm) ||
          item.category?.toLowerCase().includes(normalizedTerm),
      )
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchTerm, sourceItems])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSelectSuggestion = (item: SearchSuggestionItem) => {
    setSearchTerm(item.name)
    onSelect(item)
    setShowSuggestions(false)
  }

  const clearSearch = () => {
    setSearchTerm("")
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div className={`relative w-full max-w-md mx-auto ${className || ""}`} ref={searchRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-5 w-5 text-ink-muted" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length > 1 && setShowSuggestions(true)}
          className="w-full rounded-full border-white/[0.08] bg-white/[0.03] py-2 pl-10 pr-10 text-ink shadow-sm placeholder:text-ink-muted focus-visible:border-gold/50 focus-visible:ring-gold/20"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSearch}
            className="absolute right-2 h-8 w-8 rounded-full text-ink-muted hover:bg-white/5 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-72 w-full overflow-hidden rounded-lg border-white/[0.08] bg-surface/95 shadow-2xl backdrop-blur-xl">
          <ScrollArea className="h-full">
            <CardContent className="p-0">
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  className="flex cursor-pointer items-center justify-between border-b border-white/[0.06] p-3 transition-colors last:border-b-0 hover:bg-white/5"
                  onClick={() => handleSelectSuggestion(item)}
                >
                  <div className="min-w-0 pr-3">
                    <p className="truncate font-medium text-ink">{item.name}</p>
                    {item.subtitle ? <p className="mt-0.5 truncate text-xs text-ink-muted">{item.subtitle}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.category ? (
                      <span className="hidden rounded-full border border-gold/20 bg-gold/10 px-2 py-1 text-[11px] text-gold sm:inline">
                        {item.category}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs capitalize text-ink-muted">
                      {item.type}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}
