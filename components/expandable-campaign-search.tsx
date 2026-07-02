"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"

interface ExpandableCampaignSearchProps {
  onSearch?: (query: string) => void
}

export default function ExpandableCampaignSearch({ onSearch }: ExpandableCampaignSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleClose = () => {
    setIsExpanded(false)
    setSearchQuery("")
  }

  return (
    <div className="relative flex justify-center px-4">
      {isExpanded ? (
        <div className="w-full max-w-2xl transition-all duration-300 ease-out animate-in fade-in zoom-in-95 slide-in-from-bottom-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B949E] transition-colors duration-200">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Search companies or products..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
              className="w-full rounded-full py-4 pl-12 pr-12 bg-[#161B22] text-[#F0F6FC] border-2 border-[#60A5FA] focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-[#60A5FA] shadow-xl transition-all duration-200"
            />
            <button
              onClick={handleClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#21262D] hover:scale-110 transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="rounded-full w-16 h-16 bg-gradient-to-br from-[#60A5FA] to-[#2DD4BF] hover:from-[#60A5FA] hover:to-[#14B8A6] text-white flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-[#60A5FA]/50 shadow-lg animate-in fade-in zoom-in"
          title="Search campaigns"
        >
          <Search size={26} />
        </button>
      )}
    </div>
  )
}
