"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface CampaignSearchBarProps {
  onSearch?: (query: string) => void
}

export default function CampaignSearchBar({ onSearch }: CampaignSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    onSearch?.(value)
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search for campaigns..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full pl-12 pr-6 py-3 rounded-full bg-[#161B22] border-none text-[#F0F6FC] placeholder:text-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:ring-offset-2 focus:ring-offset-[#0D1117]"
        />
      </div>
    </div>
  )
}
