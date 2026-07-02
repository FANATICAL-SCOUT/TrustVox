"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface CaptchaProps {
  onVerify: (verified: boolean) => void
}

export default function Captcha({ onVerify }: CaptchaProps) {
  const [captchaCode, setCaptchaCode] = useState("")
  const [userInput, setUserInput] = useState("")
  const [isVerified, setIsVerified] = useState(false)

  const generateCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaCode(result)
    setUserInput("")
    setIsVerified(false)
    onVerify(false)
  }

  useEffect(() => {
    generateCaptcha()
  }, [])

  const handleVerify = () => {
    if (userInput.toUpperCase() === captchaCode) {
      setIsVerified(true)
      onVerify(true)
    } else {
      setIsVerified(false)
      onVerify(false)
      generateCaptcha()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <div className="bg-slate-700/50 border border-slate-600 rounded-md px-4 py-2 font-mono text-lg tracking-wider text-slate-200 select-none">
          {captchaCode}
        </div>
        <Button
          type="button"
          onClick={generateCaptcha}
          size="sm"
          variant="outline"
          className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter captcha code"
          className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-md text-slate-200 placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
        />
        <Button type="button" onClick={handleVerify} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white">
          Verify
        </Button>
      </div>
      {isVerified && <div className="text-sm text-green-400 flex items-center">✓ Security verification completed</div>}
    </div>
  )
}
