"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, Wallet, DollarSign, Shield, Check, Sparkles, Zap, Star, Crown } from "lucide-react"

export default function PaymentPortal() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "crypto">("card")
  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  })

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: 29,
      period: "month",
      description: "Perfect for small businesses",
      features: [
        "Up to 500 feedbacks/month",
        "Basic analytics dashboard",
        "Email support",
        "Standard templates",
        "Basic reward system",
      ],
      popular: false,
    },
    {
      id: "professional",
      name: "Professional",
      price: 99,
      period: "month",
      description: "Ideal for growing companies",
      features: [
        "Up to 2,500 feedbacks/month",
        "Advanced analytics & insights",
        "Priority support",
        "Custom templates",
        "Advanced reward system",
        "API access",
        "White-label options",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 299,
      period: "month",
      description: "For large organizations",
      features: [
        "Unlimited feedbacks",
        "Real-time analytics",
        "Dedicated account manager",
        "Custom integrations",
        "Advanced security",
        "Multi-team management",
        "Custom branding",
        "SLA guarantee",
      ],
      popular: false,
    },
  ]

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardData({
      ...cardData,
      [e.target.name]: e.target.value,
    })
  }

  const handlePayment = () => {
    console.log("Processing payment for plan:", selectedPlan)
    console.log("Payment method:", paymentMethod)
    if (paymentMethod === "card") {
      console.log("Card data:", cardData)
    }
    alert("Payment processed successfully! Welcome to Trustvox!")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-500/10 rounded-full blur-3xl pulse-glow"></div>
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pulse-glow"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl pulse-glow"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-400 via-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl float-animation">
                <div className="w-16 h-16 bg-slate-900/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl font-bold neon-text">T</span>
                </div>
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-teal-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent mb-3">
            Payment Portal
          </h1>
          <p className="text-xl text-slate-300 mb-2">Choose your cosmic plan</p>
          <p className="text-sm text-slate-400">Secure • Flexible • Rewarding</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative bg-slate-800/50 border-slate-600/30 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedPlan === plan.id ? "ring-2 ring-teal-500 border-teal-500/50" : "hover:border-slate-500/50"
              } ${plan.popular ? "border-purple-500/50" : ""}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-violet-500 text-white px-4 py-1">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-slate-100 flex items-center justify-center">
                  {plan.id === "starter" && <Zap className="w-6 h-6 mr-2 text-green-400" />}
                  {plan.id === "professional" && <Star className="w-6 h-6 mr-2 text-purple-400" />}
                  {plan.id === "enterprise" && <Crown className="w-6 h-6 mr-2 text-yellow-400" />}
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-slate-300">{plan.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold text-slate-100">${plan.price}</span>
                  <span className="text-slate-400">/{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-slate-300">
                      <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full mt-6 ${
                    selectedPlan === plan.id
                      ? "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                      : "bg-slate-700 hover:bg-slate-600"
                  } text-white font-medium`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {selectedPlan === plan.id ? "Selected" : "Select Plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Section */}
        {selectedPlan && (
          <Card className="max-w-2xl mx-auto bg-slate-800/50 border-slate-600/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-teal-400" />
                Payment Details
              </CardTitle>
              <CardDescription className="text-slate-300">
                Complete your subscription to {plans.find((p) => p.id === selectedPlan)?.name} plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "card" | "crypto")}>
                <TabsList className="grid w-full grid-cols-2 bg-slate-700/50 border border-slate-600">
                  <TabsTrigger value="card" className="data-[state=active]:bg-slate-600">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Credit Card
                  </TabsTrigger>
                  <TabsTrigger value="crypto" className="data-[state=active]:bg-slate-600">
                    <Wallet className="w-4 h-4 mr-2" />
                    Crypto
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="card" className="space-y-6 mt-6">
                  <div>
                    <Label htmlFor="cardName" className="text-slate-200 font-medium">
                      Cardholder Name
                    </Label>
                    <Input
                      id="cardName"
                      name="name"
                      value={cardData.name}
                      onChange={handleCardInputChange}
                      placeholder="John Doe"
                      className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardNumber" className="text-slate-200 font-medium">
                      Card Number
                    </Label>
                    <Input
                      id="cardNumber"
                      name="number"
                      value={cardData.number}
                      onChange={handleCardInputChange}
                      placeholder="1234 5678 9012 3456"
                      className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry" className="text-slate-200 font-medium">
                        Expiry Date
                      </Label>
                      <Input
                        id="expiry"
                        name="expiry"
                        value={cardData.expiry}
                        onChange={handleCardInputChange}
                        placeholder="MM/YY"
                        className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="text-slate-200 font-medium">
                        CVV
                      </Label>
                      <Input
                        id="cvv"
                        name="cvv"
                        value={cardData.cvv}
                        onChange={handleCardInputChange}
                        placeholder="123"
                        className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="crypto" className="space-y-6 mt-6">
                  <div className="text-center py-8">
                    <Wallet className="w-16 h-16 text-teal-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-200 mb-2">Pay with Cryptocurrency</h3>
                    <p className="text-slate-300 mb-6">Connect your wallet to complete the payment</p>
                    <div className="space-y-3">
                      <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium">
                        <Wallet className="w-5 h-5 mr-2" />
                        Connect MetaMask
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50"
                      >
                        <Wallet className="w-5 h-5 mr-2" />
                        WalletConnect
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Order Summary */}
              <div className="mt-8 bg-slate-700/30 rounded-lg p-6 border border-slate-600/30">
                <h3 className="font-semibold text-slate-200 mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan:</span>
                    <span className="text-slate-300">{plans.find((p) => p.id === selectedPlan)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Billing:</span>
                    <span className="text-slate-300">Monthly</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal:</span>
                    <span className="text-slate-300">${plans.find((p) => p.id === selectedPlan)?.price}</span>
                  </div>
                  <div className="border-t border-slate-600 pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-200">Total:</span>
                      <span className="text-slate-200">${plans.find((p) => p.id === selectedPlan)?.price}/month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-6 flex items-center justify-center text-sm text-slate-400">
                <Shield className="w-4 h-4 mr-2 text-green-400" />
                <span>Secured by 256-bit SSL encryption</span>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handlePayment}
                className="w-full mt-6 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium py-3"
                size="lg"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Complete Payment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
