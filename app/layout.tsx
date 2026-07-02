import type React from "react"
import type { Metadata } from "next"
import { Bricolage_Grotesque, DM_Sans } from "next/font/google"
import { Providers } from "./providers"
import GlobalScrollEffects from "@/components/global-scroll-effects"
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

export const metadata: Metadata = {
  title: "Trustvox - Decentralized Feedback Platform",
  description: "Earn rewards for authentic feedback on products and services",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${dmSans.variable}`}>
        <Providers>
          <RootLayoutWrapper>{children}</RootLayoutWrapper>
          <GlobalScrollEffects />
        </Providers>
      </body>
    </html>
  )
}
