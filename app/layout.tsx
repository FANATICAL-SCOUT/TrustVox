import type React from "react"
import type { Metadata } from "next"
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google"
import { Providers } from "./providers"
import GlobalScrollEffects from "@/components/global-scroll-effects"
import EmberTrailBackground from "@/components/ember-trail-background"
import RootLayoutWrapper from "./root-layout-wrapper"
import "./globals.css"

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "500", "700", "800"],
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "TrustVox — Feedback that pays you back",
  description: "Share feedback on the products you use, earn TVX tokens, and redeem them for rewards.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
        <Providers>
          <EmberTrailBackground />
          <RootLayoutWrapper>{children}</RootLayoutWrapper>
          <GlobalScrollEffects />
        </Providers>
      </body>
    </html>
  )
}
