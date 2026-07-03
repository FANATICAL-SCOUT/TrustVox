"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import BrandLogo from "@/components/brand-logo"
import { Mail, MessageSquare, Send, CheckCircle2 } from "lucide-react"

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium text-ink-dim transition-colors hover:bg-white/5 hover:text-ink"
const ctaPrimary =
  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f2c877] to-gold-deep px-5 py-3 font-semibold text-[#241a06] shadow-[0_10px_26px_-12px_rgba(235,188,107,0.5)] transition-all hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
const inputBase =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/20"

const CONTACT_CHANNELS = [
  { icon: <Mail size={18} />, label: "General", value: "hello@trustvox.com" },
  { icon: <MessageSquare size={18} />, label: "Support", value: "support@trustvox.com" },
]

interface ContactFormData {
  name: string
  email: string
  company: string
  subject: string
  message: string
}

const EMPTY_FORM: ContactFormData = { name: "", email: "", company: "", subject: "", message: "" }

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSendAnother = () => {
    setFormData(EMPTY_FORM)
    setSubmitted(false)
  }

  return (
    <div className="min-h-screen bg-background text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
          <Link href="/" className="inline-flex items-center" aria-label="TrustVox home">
            <BrandLogo width={132} height={38} priority className="h-9 w-auto" />
          </Link>
          <nav className="ml-2 hidden items-center gap-1 md:flex">
            <Link href="/#features" className={navLink}>Features</Link>
            <Link href="/#how" className={navLink}>How it works</Link>
            <Link href="/contact" className={`${navLink} bg-white/5 text-ink`}>Contact</Link>
          </nav>
          <div className="ml-auto">
            <Link
              href="/signin"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pb-4 pt-16 text-center">
        <p data-reveal-block className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Get in touch
        </p>
        <h1
          data-reveal-block
          className="mt-3 text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-5xl"
        >
          We&apos;d like to hear from you.
        </h1>
        <p data-reveal-block className="mx-auto mt-4 max-w-[52ch] text-lg leading-relaxed text-ink-dim">
          Questions about running a campaign, redeeming TVX, or anything else — send a message and we&apos;ll get
          back to you.
        </p>
      </section>

      {/* MAIN CONTENT */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Contact info */}
          <div data-reveal-card className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h2 className="font-display text-lg font-bold text-ink">Reach us directly</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              We read every message ourselves — no ticket queue.
            </p>
            <div className="mt-6 space-y-4">
              {CONTACT_CHANNELS.map((c) => (
                <div key={c.label} className="flex items-start gap-3.5">
                  <div className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-gold">
                    {c.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{c.label}</div>
                    <div className="truncate text-sm text-ink-muted">{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact form */}
          <div data-reveal-card className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-mint/25 bg-gradient-to-br from-mint/30 to-gold/20">
                  <CheckCircle2 size={30} className="text-mint" />
                </div>
                <h3 className="font-display text-xl font-bold text-ink">Message sent</h3>
                <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-ink-muted">
                  Thanks for reaching out — we&apos;ll get back to you at {formData.email || "the address you gave us"}.
                </p>
                <button
                  type="button"
                  onClick={handleSendAnother}
                  className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="text-sm font-medium text-ink-dim">
                      Full name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="text-sm font-medium text-ink-dim">
                      Email address *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className={inputBase}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="company" className="text-sm font-medium text-ink-dim">
                      Company
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Your company name"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="text-sm font-medium text-ink-dim">
                      Subject *
                    </label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="What's this about?"
                      className={inputBase}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="text-sm font-medium text-ink-dim">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us more about your needs..."
                    rows={6}
                    className={`${inputBase} resize-none`}
                  />
                </div>

                <button type="submit" className={`${ctaPrimary} w-full justify-center`}>
                  <Send size={16} />
                  Send message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-ink-muted sm:flex-row">
          <div>&copy; 2026 TrustVox. All rights reserved.</div>
          <div className="flex gap-5">
            <Link href="/" className="transition-colors hover:text-ink">Home</Link>
            <Link href="/contact" className="transition-colors hover:text-ink">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
