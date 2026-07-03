"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface InterestSelectorProps {
  selectedInterests: string[]
  onInterestsChange: (interests: string[]) => void
  disabled?: boolean
}

const predefinedInterests = [
  "Technology",
  "Gaming",
  "Food & Beverage",
  "Travel",
  "Fashion",
  "Health & Fitness",
  "Education",
  "Finance",
  "Automotive",
  "Home Goods",
  "Entertainment",
  "Sports",
]

export default function InterestSelector({
  selectedInterests,
  onInterestsChange,
  disabled = false,
}: InterestSelectorProps) {
  const [inputValue, setInputValue] = useState("")

  const addInterest = (interest: string) => {
    const normalizedInterest = interest.trim()
    if (normalizedInterest && !selectedInterests.includes(normalizedInterest)) {
      onInterestsChange([...selectedInterests, normalizedInterest])
      setInputValue("")
    }
  }

  const removeInterest = (interestToRemove: string) => {
    onInterestsChange(selectedInterests.filter((interest) => interest !== interestToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault()
      addInterest(inputValue)
    }
  }

  return (
    <div className="space-y-4">
      {!disabled && (
        <div className="flex gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new interest, or pick from below"
            className="flex-grow"
          />
          <button
            onClick={() => addInterest(inputValue)}
            className="flex-none rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 text-sm font-semibold text-[#241a06] transition-all hover:brightness-105 disabled:opacity-50"
            disabled={!inputValue.trim()}
          >
            Add
          </button>
        </div>
      )}

      {/* Selected interests */}
      {selectedInterests.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedInterests.map((interest) => (
            <span
              key={interest}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-sm font-medium text-gold"
            >
              {interest}
              {!disabled && (
                <button
                  onClick={() => removeInterest(interest)}
                  className="text-gold/70 transition-colors hover:text-gold"
                  aria-label={`Remove ${interest}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">No interests selected yet.</p>
      )}

      {/* Predefined options (edit mode only) */}
      {!disabled && (
        <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
          {predefinedInterests.map((interest) => (
            <button
              key={interest}
              onClick={() => addInterest(interest)}
              disabled={selectedInterests.includes(interest)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-ink-dim transition-colors hover:border-white/20 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {interest}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
