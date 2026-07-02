"use client"

import { useState } from "react"
import { Home, Lightbulb, History, Bell, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CollapsibleNavbarProps {
  activeSection: string
  setActiveSection: (section: string) => void
  dailyFeedbackCount: number
}

const navItems = [
  { name: "Home", section: "home", icon: Home },
  { name: "Suggested", section: "suggested", icon: Lightbulb },
  { name: "History", section: "history", icon: History },
  { name: "Profile", section: "profile", icon: User },
]

export default function CollapsibleNavbar({
  activeSection,
  setActiveSection,
  dailyFeedbackCount,
}: CollapsibleNavbarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleNavClick = (section: string) => {
    setActiveSection(section)
    setIsExpanded(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Expanded Menu */}
      {isExpanded && (
        <div className="mb-4 bg-[#161B22]/95 backdrop-blur-sm border border-[#21262D] rounded-2xl p-4 shadow-2xl w-72 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.section)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === item.section
                    ? "bg-[#2DD4BF]/20 text-[#2DD4BF]"
                    : "text-[#C9D1D9] hover:bg-[#21262D]/50 hover:text-[#2DD4BF]"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
            <div className="border-t border-[#21262D] pt-3 mt-3">
              <div className="flex items-center justify-between px-4 py-2 text-xs text-[#8B949E]">
                <span>Daily Feedbacks</span>
                <span className="font-bold text-[#2DD4BF]">{dailyFeedbackCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
          isExpanded
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-gradient-to-br from-[#2DD4BF] to-[#60A5FA] hover:from-[#2DD4BF] hover:to-[#60A5FA] text-[#0D1117]"
        }`}
      >
        {isExpanded ? <X className="w-6 h-6" /> : <Home className="w-6 h-6" />}
      </button>
    </div>
  )
}
