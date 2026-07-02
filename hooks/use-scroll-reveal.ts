import { useEffect, useRef } from "react"

interface Options {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

export function useScrollReveal<T extends HTMLElement>(options: Options = {}) {
  const { threshold = 0.1, rootMargin = "0px 0px -48px 0px", once = true } = options
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed")
          if (once) observer.unobserve(el)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return ref
}

export function useStaggerReveal<T extends HTMLElement>(count: number, stepMs = 90, options: Options = {}) {
  const { threshold = 0.1, rootMargin = "0px 0px -48px 0px", once = true } = options
  const refs = useRef<(T | null)[]>([])

  useEffect(() => {
    const elements = refs.current.filter(Boolean) as T[]
    if (!elements.length) return

    elements.forEach((el, i) => {
      el.style.transitionDelay = `${i * stepMs}ms`
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
            if (once) observer.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [count, stepMs, threshold, rootMargin, once])

  return refs
}
