"use client"

import { useEffect } from "react"

function splitWordsForReveal(root: ParentNode) {
  const textTargets = root.querySelectorAll("[data-reveal-text]")

  textTargets.forEach((node: Element) => {
    if (!(node instanceof HTMLElement)) return
    const el = node
    if (el.dataset.revealProcessed === "true") return

    // Keep custom-designed headings intact (e.g. hero titles with styled span lines).
    if (el.children.length > 0) return

    // Skip if it contains interactive nested controls to avoid DOM side effects.
    if (el.querySelector("input, textarea, select, button, a")) return

    const text = el.textContent?.trim()
    if (!text) return

    el.dataset.revealProcessed = "true"
    el.classList.add("global-reveal-text")
    el.textContent = ""

    const parts = text.split(/(\s+)/)
    parts.forEach((part, index) => {
      if (part.trim() === "") {
        el.appendChild(document.createTextNode(" "))
        return
      }

      const wrap = document.createElement("span")
      wrap.className = "word-wrap"

      const word = document.createElement("span")
      word.className = "word"
      word.textContent = part
      word.style.transitionDelay = `${index * 38}ms`

      wrap.appendChild(word)
      el.appendChild(wrap)
    })
  })
}

export default function GlobalScrollEffects() {
  useEffect(() => {
    const blockSelector = "[data-reveal-block], .reveal-block"
    const cardSelector = "[data-reveal-card], .reveal-card"

    const blockObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed")
            blockObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" },
    )

    let cardIndex = 0

    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!(entry.target instanceof HTMLElement)) return
            if (!entry.target.dataset.revealDelaySet) {
              entry.target.style.transitionDelay = `${cardIndex * 90}ms`
              entry.target.dataset.revealDelaySet = "true"
              cardIndex += 1
            }
            entry.target.classList.add("is-revealed")
            cardObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )

    const textObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed")
            textObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    )

    // Elements already inside the initial viewport are shown immediately instead of
    // being hidden-then-revealed — avoids a visible flash while the observer's first
    // callback is pending. Only genuinely below-the-fold content gets the reveal treatment.
    const isInInitialViewport = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      return rect.top < window.innerHeight && rect.bottom > 0
    }

    const wireElements = () => {
      splitWordsForReveal(document)

      document.querySelectorAll(blockSelector).forEach((el) => {
        if (!(el instanceof HTMLElement)) return
        if (!el.dataset.revealBound) {
          el.dataset.revealBound = "true"
          el.classList.add("global-reveal-block")
          if (isInInitialViewport(el)) {
            el.classList.add("is-revealed")
          } else {
            blockObserver.observe(el)
          }
        }
      })

      document.querySelectorAll(cardSelector).forEach((el) => {
        if (!(el instanceof HTMLElement)) return
        if (!el.dataset.revealCardBound) {
          el.dataset.revealCardBound = "true"
          el.classList.add("global-reveal-card")
          if (isInInitialViewport(el)) {
            el.classList.add("is-revealed")
          } else {
            cardObserver.observe(el)
          }
        }
      })

      document.querySelectorAll(".global-reveal-text").forEach((el) => {
        if (!(el instanceof HTMLElement)) return
        if (!el.dataset.revealTextBound) {
          el.dataset.revealTextBound = "true"
          if (isInInitialViewport(el)) {
            el.classList.add("is-revealed")
          } else {
            textObserver.observe(el)
          }
        }
      })
    }

    wireElements()

    let mutationFrame = 0
    const mutationObserver = new MutationObserver(() => {
      if (mutationFrame) return
      mutationFrame = window.requestAnimationFrame(() => {
        wireElements()
        mutationFrame = 0
      })
    })

    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      if (mutationFrame) {
        window.cancelAnimationFrame(mutationFrame)
      }
      mutationObserver.disconnect()
      blockObserver.disconnect()
      cardObserver.disconnect()
      textObserver.disconnect()
    }
  }, [])

  return null
}
