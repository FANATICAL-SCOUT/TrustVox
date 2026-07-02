"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  suggestions?: string[]
}

export default function SearchBar({
  placeholder = "Search campaigns, feedback, analytics...",
  onSearch,
  suggestions = [
    "Recent Campaigns",
    "Pending Feedback",
    "Performance Reports",
    "Customer Reviews",
    "Survey Results",
  ],
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (onSearch) {
      onSearch(query)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSearch(suggestion)
    setShowSuggestions(false)
  }

  const handleClear = () => {
    setSearchQuery("")
    setShowSuggestions(false)
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className={`relative transition-all duration-300 ${isActive ? "scale-105" : "scale-100"}`}>
        {/* Search Container */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#2DD4BF]/20 to-[#60A5FA]/20 rounded-full blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>

          <div className="relative flex items-center bg-[#161B22]/60 border border-[#30363D]/40 rounded-full px-6 py-3 backdrop-blur-md hover:border-[#30363D]/60 transition-all duration-300 focus-within:border-[#2DD4BF]/50 focus-within:shadow-lg focus-within:shadow-[#2DD4BF]/20">
            <Search className="w-5 h-5 text-[#8B949E] mr-3 flex-shrink-0" />

            <Input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(e.target.value.length > 0)
              }}
              onFocus={() => {
                setIsActive(true)
                if (searchQuery.length === 0) {
                  setShowSuggestions(true)
                }
              }}
              onBlur={() => {
                setIsActive(false)
                setTimeout(() => setShowSuggestions(false), 200)
              }}
              className="flex-1 bg-transparent border-0 outline-none text-[#F0F6FC] placeholder:text-[#484F58] focus:ring-0"
            />

            {searchQuery && (
              <button
                onClick={handleClear}
                className="ml-2 p-1 hover:bg-[#21262D]/50 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-[#8B949E] hover:text-[#C9D1D9]" />
              </button>
            )}

            <Button
              onClick={() => handleSearch(searchQuery)}
              className="ml-3 bg-gradient-to-r from-[#2DD4BF] to-[#60A5FA] hover:from-[#14B8A6] hover:to-[#3B82F6] text-white rounded-full px-6 py-1 text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-[#2DD4BF]/30"
            >
              Search
            </Button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-[#161B22]/90 border border-[#30363D]/40 rounded-2xl backdrop-blur-md shadow-2xl shadow-[#0D1117]/50 overflow-hidden">
            <div className="p-4">
              <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Quick Search</p>

              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#21262D]/50 transition-colors text-left group"
                  >
                    <Search className="w-4 h-4 text-[#484F58] group-hover:text-[#2DD4BF] transition-colors" />
                    <span className="text-[#C9D1D9] group-hover:text-[#F0F6FC] transition-colors">{suggestion}</span>
                    <span className="ml-auto text-[#30363D] group-hover:text-[#484F58] transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>

              {/* Recent Searches Section (can be populated dynamically) */}
              <div className="mt-4 pt-4 border-t border-[#30363D]/30">
                <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Tips</p>
                <ul className="text-xs text-[#484F58] space-y-1">
                  <li>• Use quotes for exact matches: "campaign name"</li>
                  <li>• Search by date: campaigns since:2026-01</li>
                  <li>• Filter by status: status:active</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
