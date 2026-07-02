"use client"

import type React from "react"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface InterestSelectorProps {
  selectedInterests: string[]
  onInterestsChange: (interests: string[]) => void
  disabled?: boolean
}

export default function InterestSelector({
  selectedInterests,
  onInterestsChange,
  disabled = false,
}: InterestSelectorProps) {
  const [inputValue, setInputValue] = useState("")

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
        <div className="flex space-x-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new interest or select below"
            className="flex-grow bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500"
            disabled={disabled}
          />
          <Button onClick={() => addInterest(inputValue)} className="bg-teal-600 hover:bg-teal-700" disabled={disabled}>
            Add
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {selectedInterests.map((interest) => (
          <Badge
            key={interest}
            className="bg-teal-500/80 text-white px-3 py-1 rounded-full flex items-center gap-1 font-medium"
          >
            {interest}
            {!disabled && (
              <button
                onClick={() => removeInterest(interest)}
                className="ml-1 text-white/80 hover:text-white transition-colors"
                aria-label={`Remove ${interest}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {predefinedInterests.map((interest) => (
          <Button
            key={interest}
            variant="outline"
            size="sm"
            onClick={() => addInterest(interest)}
            className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50"
            disabled={selectedInterests.includes(interest) || disabled}
          >
            {interest}
          </Button>
        ))}
      </div>
    </div>
  )
}
