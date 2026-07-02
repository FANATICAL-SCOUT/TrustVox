"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Users, Building2, Shield, ChevronDown } from "lucide-react"
import BrandLogo from "@/components/brand-logo"

export default function TopNavbar() {
  const router = useRouter()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D1117]/80 backdrop-blur-md border-b border-[#21262D]/50">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div
            onClick={() => router.push("/")}
            className="inline-flex items-center cursor-pointer hover:opacity-80 transition-opacity"
          >
            <BrandLogo width={138} height={40} priority className="h-10 w-auto" />
          </div>

          {/* Login Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-[#161B22]/80 border-[#30363D] text-[#F0F6FC] hover:bg-[#21262D]/50 hover:border-[#484F58]"
              >
                Login
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-[#161B22] border-[#21262D] text-[#F0F6FC]"
            >
              <DropdownMenuItem
                onClick={() => router.push("/signin")}
                className="cursor-pointer hover:bg-[#21262D] focus:bg-[#21262D]"
              >
                <Users className="mr-3 h-5 w-5 text-[#2DD4BF]" />
                <div>
                  <div className="font-medium">User Login</div>
                  <div className="text-xs text-[#8B949E]">Individual account</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/client-login")}
                className="cursor-pointer hover:bg-[#21262D] focus:bg-[#21262D]"
              >
                <Building2 className="mr-3 h-5 w-5 text-[#A78BFA]" />
                <div>
                  <div className="font-medium">Client Login</div>
                  <div className="text-xs text-[#8B949E]">Business account</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/admin-login")}
                className="cursor-pointer hover:bg-[#21262D] focus:bg-[#21262D]"
              >
                <Shield className="mr-3 h-5 w-5 text-[#60A5FA]" />
                <div>
                  <div className="font-medium">Admin Login</div>
                  <div className="text-xs text-[#8B949E]">Administrator access</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </nav>
  )
}
