"use client"

import { useEffect, useRef, createElement } from "react"
import type { ReactNode, ElementType } from "react"
import styles from "@/app/trustvox.module.css"

interface RevealTextProps {
  children: ReactNode
  as?: ElementType
  className?: string
  wordDelay?: number
  threshold?: number
}

export default function RevealText({
  children,
  as: Tag = "p" as ElementType,
  className = "",
  wordDelay = 38,
  threshold = 0.1,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null)
  const words = (typeof children === "string" ? children : "").split(/(\s+)/)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const wordEls = el.querySelectorAll(`.${styles.word}`)
    wordEls.forEach((w: Element, index: number) => {
      ;(w as HTMLElement).style.transitionDelay = `${index * wordDelay}ms`
    })

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(styles.revealed)
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin: "0px 0px -48px 0px" },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [wordDelay, threshold])

  return createElement(
    Tag,
    { ref, className: `${styles.revealText} ${className}` },
    words.map((w: string, i: number) =>
      w.trim() === ""
        ? createElement("span", { key: i }, " ")
        : createElement(
            "span",
            { key: i, className: styles.wordWrap },
            createElement("span", { className: styles.word }, w),
          ),
    ),
  )
}
