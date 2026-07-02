"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, CheckCircle2, AlertTriangle } from "lucide-react"

interface EmailSignOnProps {
  onSignOnSuccess: (email: string) => void
  onSignOnError: (error: string) => void
  title?: string
  subtitle?: string
  colorScheme?: "purple" | "red"
}

export default function EmailSignOn({
  onSignOnSuccess,
  onSignOnError,
  title = "Email Sign On",
  subtitle = "Verify with your email to sign in securely",
  colorScheme = "purple",
}: EmailSignOnProps) {
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [step, setStep] = useState<"email" | "verify">("email")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const accentColor = colorScheme === "purple" ? "purple" : "red"
  const accentBorder = colorScheme === "purple" ? "border-[#A78BFA]" : "border-red-500"
  const accentBg = colorScheme === "purple" ? "bg-[#A78BFA]/10" : "bg-red-500/10"
  const accentText = colorScheme === "purple" ? "text-[#A78BFA]" : "text-red-400"
  const accentRing = colorScheme === "purple" ? "focus:ring-[#2DD4BF]/20" : "focus:ring-red-500/20"

  const handleSendCode = async () => {
    setError("")
    setSuccess("")

    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    setLoading(true)
    // Simulate sending verification code
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLoading(false)

    // In real implementation, this would send an email with a code
    // For demo, we'll show a mock verification code
    const mockCode = "123456"
    localStorage.setItem(`emailVerificationCode_${email}`, mockCode)
    localStorage.setItem(`emailVerificationTime_${email}`, Date.now().toString())

    setSuccess(`Verification code sent! (Demo: ${mockCode})`)
    setStep("verify")
  }

  const handleVerifyCode = async () => {
    setError("")
    setSuccess("")

    if (!verificationCode.trim()) {
      setError("Please enter the verification code")
      return
    }

    setLoading(true)
    // Simulate verification
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLoading(false)

    const storedCode = localStorage.getItem(`emailVerificationCode_${email}`)
    const verificationTime = parseInt(localStorage.getItem(`emailVerificationTime_${email}`) || "0")

    // Check if code matches and is not expired (5 minutes)
    if (storedCode === verificationCode && Date.now() - verificationTime < 5 * 60 * 1000) {
      localStorage.removeItem(`emailVerificationCode_${email}`)
      localStorage.removeItem(`emailVerificationTime_${email}`)
      onSignOnSuccess(email)
    } else {
      setError("Invalid or expired verification code")
    }
  }

  return (
    <div className={`bg-[#161B22]/80 border border-[#30363D] backdrop-blur-sm rounded-lg p-6 ${accentBg} border-t-2 ${accentBorder}`}>
      <div className="text-center mb-6">
        <div className={`inline-flex items-center justify-center w-12 h-12 bg-${accentColor}-500/20 rounded-full mb-3`}>
          <Mail className={`w-6 h-6 ${accentText}`} />
        </div>
        <h3 className="text-lg font-semibold text-[#F0F6FC] mb-1">{title}</h3>
        <p className="text-sm text-[#8B949E]">{subtitle}</p>
      </div>

      {step === "email" ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="sign-on-email" className="text-[#C9D1D9] text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="sign-on-email"
              type="email"
              placeholder="your.email@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError("")
              }}
              disabled={loading}
              className="mt-1 bg-[#161B22]/80 border-[#30363D] text-[#F0F6FC] placeholder:text-[#484F58] focus:border-[#2DD4BF] focus:ring-[#2DD4BF]/20"
            />
          </div>

          {error && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSendCode}
            disabled={loading}
            className={`w-full bg-gradient-to-r from-${accentColor}-500 to-${accentColor === "purple" ? "violet" : "rose"}-500 hover:from-${accentColor}-600 hover:to-${accentColor === "purple" ? "violet" : "rose"}-600 text-white font-medium`}
          >
            <Mail className="w-4 h-4 mr-2" />
            {loading ? "Sending..." : "Send Verification Code"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="verification-code" className="text-[#C9D1D9] text-sm font-medium">
              Verification Code
            </Label>
            <p className="text-xs text-[#8B949E] mt-1 mb-2">Enter the code sent to {email}</p>
            <Input
              id="verification-code"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => {
                setVerificationCode(e.target.value)
                setError("")
              }}
              disabled={loading}
              maxLength={6}
              className="mt-1 bg-[#161B22]/80 border-[#30363D] text-[#F0F6FC] placeholder:text-[#484F58] focus:border-[#2DD4BF] focus:ring-[#2DD4BF]/20 text-center text-2xl tracking-widest"
            />
          </div>

          {error && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300 text-sm">{success}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleVerifyCode}
            disabled={loading}
            className={`w-full bg-gradient-to-r from-${accentColor}-500 to-${accentColor === "purple" ? "violet" : "rose"}-500 hover:from-${accentColor}-600 hover:to-${accentColor === "purple" ? "violet" : "rose"}-600 text-white font-medium`}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {loading ? "Verifying..." : "Verify Code"}
          </Button>

          <Button
            onClick={() => {
              setStep("email")
              setVerificationCode("")
              setSuccess("")
            }}
            variant="link"
            className={`w-full text-${accentColor}-300 hover:text-${accentColor}-200`}
          >
            Use different email
          </Button>
        </div>
      )}
    </div>
  )
}
