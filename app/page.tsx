"use client"

import Link from "next/link"
import RevealText from "@/components/reveal-text"
import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal"
import BrandLogo from "@/components/brand-logo"
import styles from "./trustvox.module.css"

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4l3 3" />
  </svg>
)
const MonitorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)
const CreditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
)

const FEATURES = [
  {
    icon: <UsersIcon />,
    name: "Verified Contributors",
    desc: "Every respondent is identity-verified, ensuring feedback comes from real users who match your exact target demographic.",
  },
  {
    icon: <ActivityIcon />,
    name: "Real-time Analytics",
    desc: "Watch feedback roll in live with sentiment analysis, trend detection, and exportable dashboards built for decision-makers.",
  },
  {
    icon: <ClockIcon />,
    name: "Fast Turnaround",
    desc: "Launch a campaign and start receiving quality responses in under 24 hours - no lengthy recruitment or panel setup required.",
  },
  {
    icon: <MonitorIcon />,
    name: "Multi-format Surveys",
    desc: "Video responses, ratings, open text, NPS - mix and match formats to capture the depth of insight your team needs.",
  },
  {
    icon: <ShieldIcon />,
    name: "Privacy First",
    desc: "Privacy by design. Respondent data is anonymised by default, and every action runs through role-based access controls.",
  },
  {
    icon: <CreditIcon />,
    name: "Flexible Rewards",
    desc: "Set your own reward structure - cash, gift cards, or credits. Automatically disbursed when responses are verified.",
  },
]

const STEPS = [
  {
    num: "01",
    title: "Create a campaign",
    desc: "Define your target audience, craft your questions, and set your reward. Takes less than 10 minutes.",
  },
  {
    num: "02",
    title: "Collect responses",
    desc: "Verified contributors answer on their schedule. Every response is quality-checked before it reaches you.",
  },
  {
    num: "03",
    title: "Act on insights",
    desc: "Explore your dashboard, export to your tools, and ship products your users actually want.",
  },
]

export default function HomePage() {
  const heroSubRef = useScrollReveal<HTMLParagraphElement>()
  const heroCtasRef = useScrollReveal<HTMLDivElement>()
  const heroProofRef = useScrollReveal<HTMLDivElement>()
  const ctaBlockRef = useScrollReveal<HTMLDivElement>()

  const cardRefs = useStaggerReveal<HTMLDivElement>(FEATURES.length, 90)
  const stepRefs = useStaggerReveal<HTMLDivElement>(STEPS.length, 120)

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.navLogo}>
          <BrandLogo width={138} height={40} priority className="h-10 w-auto" />
        </Link>
        <div className={styles.navLinks}>
          <Link href="#features" className={styles.navLink}>
            Features
          </Link>
          <Link href="#how" className={styles.navLink}>
            How it works
          </Link>
          <Link href="#contact" className={styles.navLink}>
            Contact
          </Link>
        </div>
        <div className={styles.navActions}>
          <Link href="/signin" className={styles.btnGhost}>
            Sign in
          </Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={`${styles.glowOrb} ${styles.glow1}`} />
        <div className={`${styles.glowOrb} ${styles.glow2}`} />
        <div className={`${styles.glowOrb} ${styles.glow3}`} />

        <h1 className={styles.heroTitle}>
          <span className={styles.line1}>Feedback that</span>
          <span className={styles.line2}>actually matters</span>
        </h1>

        <p ref={heroSubRef} className={`${styles.heroSub} ${styles.revealBlock}`}>
          TrustVox connects companies with real users through precision feedback campaigns. Earn rewards. Drive
          decisions. Build trust.
        </p>

        <div ref={heroCtasRef} className={`${styles.heroCtas} ${styles.revealBlock}`}>
          <Link href="/signin" className={styles.ctaPrimary}>
            Start for Free
          </Link>
          <Link href="/signup" className={styles.ctaSecondary}>
            I&apos;m a contributor -&gt;
          </Link>
        </div>

        <div ref={heroProofRef} className={`${styles.heroProof} ${styles.revealBlock}`}>
          <div className={styles.proofAvatars}>
            <div className={`${styles.proofAvatar} ${styles.av1}`}>AK</div>
            <div className={`${styles.proofAvatar} ${styles.av2}`}>MJ</div>
            <div className={`${styles.proofAvatar} ${styles.av3}`}>SR</div>
            <div className={`${styles.proofAvatar} ${styles.av4}`}>+</div>
          </div>
          <div className={styles.proofText}>
            <strong>Feedback that earns</strong>
            <br />
            rewards for every voice
          </div>
          <div className={styles.proofDivider} />
          <div className={styles.proofStat}>
            <div className="num">TVX</div>
            <div className="lbl">rewards</div>
          </div>
          <div className={styles.proofDivider} />
          <div className={styles.proofStat}>
            <div className="num">3 steps</div>
            <div className="lbl">to launch</div>
          </div>
        </div>

        <div className={styles.scrollHint}>
          <div className={styles.scrollLine} />
          scroll
        </div>
      </section>

      <section className={styles.features} id="features">
        <RevealText as="p" className={styles.sectionEyebrow}>
          Why TrustVox
        </RevealText>
        <RevealText as="h2" className={styles.sectionTitle}>
          Everything you need to capture real feedback
        </RevealText>

        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div
              key={f.name}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              className={`${styles.featCard} ${styles.revealCard}`}
            >
              <div className={styles.featIcon}>{f.icon}</div>
              <div className={styles.featName}>{f.name}</div>
              <div className={styles.featDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.how} id="how">
        <div className={styles.howInner}>
          <RevealText as="p" className={styles.sectionEyebrow}>
            The process
          </RevealText>
          <RevealText as="h2" className={styles.sectionTitle}>
            Three steps to better decisions
          </RevealText>

          <div className={styles.steps}>
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                ref={(el) => {
                  stepRefs.current[i] = el
                }}
                className={`${styles.step} ${styles.revealCard}`}
              >
                <div className={styles.stepNum}>{s.num}</div>
                <div className={styles.stepTitle}>{s.title}</div>
                <div className={styles.stepDesc}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.footerCta}>
        <div className={`${styles.glowOrb} ${styles.glow1}`} style={{ top: "auto", bottom: "-100px", left: "30%", opacity: 0.6 }} />
        <div ref={ctaBlockRef} className={`${styles.footerCtaInner} ${styles.revealBlock}`}>
          <RevealText as="h2">Ready to build trust at scale?</RevealText>
          <p>Join thousands of companies using TrustVox to make better decisions, faster.</p>
          <div className={styles.footerCtaBtns}>
            <Link href="/signin" className={styles.ctaPrimary}>
              Start for Free
            </Link>
            <Link href="/contact" className={styles.ctaSecondary}>
              Talk to sales
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer} id="contact">
        <div>Copyright 2026 TrustVox. All rights reserved.</div>
        <div className={styles.footerLinks}>
          <Link href="/" className={styles.footerLink}>
            Privacy
          </Link>
          <Link href="/" className={styles.footerLink}>
            Terms
          </Link>
          <Link href="/contact" className={styles.footerLink}>
            Contact
          </Link>
        </div>
      </footer>
    </div>
  )
}
