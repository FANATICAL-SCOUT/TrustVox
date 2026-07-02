"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen app-page bg-[#0D1117] text-[#F0F6FC] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border border-[#30363D] bg-[#161B22] p-8 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-xl bg-[#F87171]/10 border border-[#F87171]/30 flex items-center justify-center">
          <AlertTriangle className="text-[#F87171]" size={28} />
        </div>
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-sm text-[#8B949E]">The route you are trying to open does not exist. Please use dashboard navigation.</p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" className="border-[#30363D] text-[#C9D1D9]" onClick={() => router.back()}>
            <ArrowLeft className="mr-2" size={14} /> Go Back
          </Button>
          <Button className="bg-[#60A5FA] hover:bg-[#3B82F6] text-white" onClick={() => router.push("/")}>
            <Home className="mr-2" size={14} /> Home
          </Button>
        </div>
      </div>
    </div>
  )
}
