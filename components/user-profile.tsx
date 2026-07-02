"use client"

import { Textarea } from "@/components/ui/textarea"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Calendar, LogOut, Edit, Save, X, Shield, Eye, Copy, Check, Flame } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import InterestSelector from "./interest-selector"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime" // Correct import for useRouter type
import { clearUserSession } from "@/lib/auth-utils"

interface UserProfileProps {
  router: AppRouterInstance // Use the correct type for useRouter
  savedFeedbacks: any[] // New prop for saved feedbacks
  onContinueEditing: (feedbackData: any) => void // New prop to continue editing a draft
}

export default function UserProfile({ router, savedFeedbacks, onContinueEditing }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [identityIds, setIdentityIds] = useState({ walletId: "", userId: "" })
  const [copiedKey, setCopiedKey] = useState<"wallet" | "user" | null>(null)
  const [userInfo, setUserInfo] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    age: 28,
    address: "123 Main Street, New York, NY 10001",
    joinDate: "2023-06-15",
    bio: "Tech enthusiast and product reviewer. Love trying new apps and services.",
    interests: ["Technology", "Gaming", "Food & Beverage", "Travel"],
  })

  const toHex16 = (value: bigint) => {
    return value.toString(16).toUpperCase().padStart(16, "0").slice(-16)
  }

  const hashToHex16 = (seed: string) => {
    let hash = 0xcbf29ce484222325n
    const prime = 0x100000001b3n
    const mask = 0xffffffffffffffffn

    for (const character of seed) {
      hash ^= BigInt(character.charCodeAt(0))
      hash = (hash * prime) & mask
    }

    return toHex16(hash)
  }

  const buildUserId = (seed: string) => {
    return `0x${hashToHex16(seed)}`
  }

  const buildWalletId = (joinDate: string, userId: string) => {
    const parsed = new Date(joinDate)
    const year = Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear()
    const month = Number.isNaN(parsed.getTime()) ? new Date().getMonth() + 1 : parsed.getMonth() + 1
    const userPrefix = userId.replace(/^0x/i, "").toUpperCase().slice(0, 8).padEnd(8, "0")

    return `TVX-${year}-${String(month).padStart(2, "0")}-${userPrefix}`
  }

  useEffect(() => {
    // Load user data from localStorage on component mount
    const storedUserData = localStorage.getItem("currentUser")
    if (storedUserData) {
      let userData: Record<string, any> = {}
      try {
        userData = JSON.parse(storedUserData)
      } catch {
        localStorage.removeItem("currentUser")
      }
      const resolvedJoinDate = userData.joinDate || "2023-06-15"
      const resolvedName = userData.name || "John Doe"
      const resolvedEmail = userData.email || "john.doe@example.com"
      const identitySeed = `${resolvedEmail.toLowerCase()}|${resolvedJoinDate}`
      const userId = buildUserId(identitySeed)
      const walletId = buildWalletId(resolvedJoinDate, userId)

      setUserInfo({
        name: resolvedName,
        email: resolvedEmail,
        age: userData.age || 28,
        address: userData.address || "123 Main Street, New York, NY 10001",
        joinDate: resolvedJoinDate,
        bio: userData.bio || "Tech enthusiast and product reviewer. Love trying new apps and services.",
        interests: userData.interests || ["Technology", "Gaming", "Food & Beverage", "Travel"],
      })

      setIdentityIds({ walletId, userId })

      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          ...userData,
          joinDate: resolvedJoinDate,
          walletId,
          userId,
        }),
      )
      return
    }

    const fallbackJoinDate = "2023-06-15"
    const fallbackName = "John Doe"
    const fallbackEmail = "john.doe@example.com"
    const fallbackSeed = `${fallbackEmail.toLowerCase()}|${fallbackJoinDate}`
    const fallbackUserId = buildUserId(fallbackSeed)

    setIdentityIds({
      walletId: buildWalletId(fallbackJoinDate, fallbackUserId),
      userId: fallbackUserId,
    })

    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        name: fallbackName,
        email: fallbackEmail,
        age: 28,
        address: "123 Main Street, New York, NY 10001",
        joinDate: fallbackJoinDate,
        bio: "Tech enthusiast and product reviewer. Love trying new apps and services.",
        interests: ["Technology", "Gaming", "Food & Beverage", "Travel"],
        walletId: buildWalletId(fallbackJoinDate, fallbackUserId),
        userId: fallbackUserId,
      }),
    )
  }, [])

  const handleSave = () => {
    setIsEditing(false)
    const identitySeed = `${userInfo.email.toLowerCase()}|${userInfo.joinDate}`
    const userId = buildUserId(identitySeed)
    const walletId = buildWalletId(userInfo.joinDate, userId)
    setIdentityIds({ userId, walletId })

    // Save to localStorage
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        ...userInfo,
        userId,
        walletId,
      }),
    )
    console.log("Saving user info:", { ...userInfo, userId, walletId })
  }

  const handleLogout = () => {
    console.log("Logging out...")
    clearUserSession()
    router.push("/")
  }

  const copyIdentity = async (value: string, key: "wallet" | "user") => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)

      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current))
      }, 1200)
    } catch {
      setCopiedKey(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/80 text-white"
      case "pending":
        return "bg-yellow-500/80 text-white"
      case "rejected":
        return "bg-red-500/80 text-white"
      case "draft":
        return "bg-blue-500/80 text-white" // Color for drafts
      default:
        return "bg-slate-500/80 text-white"
    }
  }

  const streakStats = {
    currentStreak: 12,
    longestStreak: 18,
  }

  const streakDays = Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    hasActivity: i < streakStats.currentStreak,
  }))

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center text-[rgba(241,245,249,0.7)] hover:text-[#a78bfa]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4" data-reveal-block>
        <div className="flex items-center text-center sm:text-left">
          <User className="w-8 h-8 text-[#a78bfa] mr-4 flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-bold text-slate-100">User Profile</h1>
            <p className="text-slate-300 mt-2">Manage your account information and preferences</p>
          </div>
        </div>
        <div className="flex space-x-3 flex-wrap justify-center sm:justify-end">
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 font-medium">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="bg-slate-800/50 border-slate-600 text-slate-200 font-medium"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/50 font-medium"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className="space-card border-slate-600/30" data-reveal-card>
            <CardHeader className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl font-bold text-white">
                  {userInfo.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <CardTitle className="text-slate-100 text-xl">{userInfo.name}</CardTitle>
              <CardDescription className="text-slate-300 font-medium">Active Reviewer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Badge className="bg-green-600/80 text-white font-medium">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
                <Badge className="bg-yellow-500/80 text-white font-medium">Premium</Badge>
              </div>

              <Separator className="bg-slate-600" />

              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 mr-2 text-[#a78bfa]" />
                  <span className="text-slate-200 font-medium">
                    Joined {new Date(userInfo.joinDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 mr-2 text-[#a78bfa]" />
                  <span className="truncate text-slate-200 font-medium">{userInfo.email}</span>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Wallet ID</p>
                    <button
                      type="button"
                      onClick={() => copyIdentity(identityIds.walletId, "wallet")}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-violet-200 transition-colors"
                      aria-label="Copy Wallet ID"
                    >
                      {copiedKey === "wallet" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedKey === "wallet" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-300/85 break-all">{identityIds.walletId}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">User ID</p>
                    <button
                      type="button"
                      onClick={() => copyIdentity(identityIds.userId, "user")}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-violet-200 transition-colors"
                      aria-label="Copy User ID"
                    >
                      {copiedKey === "user" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedKey === "user" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-300/85 break-all">{identityIds.userId}</p>
                </div>
              </div>

              <Separator className="bg-slate-600" />

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full text-red-400 hover:text-red-300 bg-slate-800/50 border-red-500/30 hover:bg-red-500/10 font-medium"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="space-card border-slate-600/30" data-reveal-card>
            <CardHeader>
              <CardTitle className="text-slate-100">Personal Information</CardTitle>
              <CardDescription className="text-slate-300">Your basic profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-slate-200 font-medium">
                    Full Name
                  </Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={userInfo.name}
                      onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                      placeholder="John Doe"
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-slate-100 font-medium bg-slate-800/30 p-2 rounded border border-slate-700">
                      {userInfo.name}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="age" className="text-slate-200 font-medium">
                    Age
                  </Label>
                  {isEditing ? (
                    <Input
                      id="age"
                      type="number"
                      value={userInfo.age}
                      onChange={(e) => setUserInfo({ ...userInfo, age: Number.parseInt(e.target.value) })}
                      placeholder="28"
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-slate-100 font-medium bg-slate-800/30 p-2 rounded border border-slate-700">
                      {userInfo.age}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address" className="text-slate-200 font-medium">
                  Address
                </Label>
                {isEditing ? (
                  <Input
                    id="address"
                    value={userInfo.address}
                    onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
                    placeholder="123 Main Street, New York, NY 10001"
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-slate-100 font-medium bg-slate-800/30 p-2 rounded border border-slate-700">
                    {userInfo.address}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="bio" className="text-slate-200 font-medium">
                  Bio
                </Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={userInfo.bio}
                    onChange={(e) => setUserInfo({ ...userInfo, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-slate-100 font-medium bg-slate-800/30 p-2 rounded border border-slate-700">
                    {userInfo.bio}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          <Card className="space-card border-slate-600/30" data-reveal-card>
            <CardHeader>
              <CardTitle className="text-slate-100">Interests</CardTitle>
              <CardDescription className="text-slate-300">
                Select or add topics you're interested in providing feedback on.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InterestSelector
                selectedInterests={userInfo.interests}
                onInterestsChange={(newInterests) => setUserInfo({ ...userInfo, interests: newInterests })}
                disabled={!isEditing}
              />
            </CardContent>
          </Card>

          {/* Saved Feedbacks (Drafts) */}
          <Card className="space-card border-slate-600/30" data-reveal-card>
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#a78bfa]" />
                Daily Streak
              </CardTitle>
              <CardDescription className="text-slate-300">Keep your streak alive by staying active daily.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {streakDays.map((day) => (
                  <div
                    key={day.day}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                      day.hasActivity ? "bg-[#7c3aed] text-white" : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {day.day}
                  </div>
                ))}
              </div>

              <Progress value={(streakStats.currentStreak / streakStats.longestStreak) * 100} className="w-full" />

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-[#c7b7ff]">Current: {streakStats.currentStreak} days</span>
                <span className="text-slate-400">Best: {streakStats.longestStreak} days</span>
              </div>
            </CardContent>
          </Card>

          <Card className="space-card border-slate-600/30" data-reveal-card>
            <CardHeader>
              <CardTitle className="text-slate-100">Saved Feedbacks (Drafts)</CardTitle>
              <CardDescription className="text-slate-300">Continue editing your saved feedback drafts.</CardDescription>
            </CardHeader>
            <CardContent>
              {savedFeedbacks.length > 0 ? (
                <div className="space-y-4">
                  {savedFeedbacks.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/30"
                    >
                      <div>
                        <p className="font-medium text-slate-200">
                          {feedback.product} ({feedback.company})
                        </p>
                        <p className="text-sm text-slate-400">Saved: {feedback.date}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onContinueEditing(feedback)}
                        className="bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] hover:brightness-110 text-white font-medium"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Continue Editing
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4">No saved drafts found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
