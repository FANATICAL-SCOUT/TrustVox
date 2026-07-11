"use client"

import { useEffect } from "react"

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

    // Cards stagger *within a single intersection batch* (a grid scrolling into
    // view together), then reset — so a card deep in the page never inherits a
    // huge accumulated delay. Capped so a large grid still finishes quickly.
    const cardObserver = new IntersectionObserver(
      (entries) => {
        let batchIndex = 0
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (!(entry.target instanceof HTMLElement)) return
          if (!entry.target.dataset.revealDelaySet) {
            const step = Math.min(batchIndex, 5) * 55
            entry.target.style.transitionDelay = `${step}ms`
            entry.target.dataset.revealDelaySet = "true"
            batchIndex += 1
          }
          entry.target.classList.add("is-revealed")
          cardObserver.unobserve(entry.target)
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )

    // Elements already inside the initial viewport are shown immediately instead of
    // being hidden-then-revealed — avoids a visible flash while the observer's first
    // callback is pending. Only genuinely below-the-fold content gets the reveal treatment.
    const isInInitialViewport = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      return rect.top < window.innerHeight && rect.bottom > 0
    }

    const wireElements = () => {
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
    }
  }, [])

  return null
}
