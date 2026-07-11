"use client"

import { useEffect, useRef } from "react"

/**
 * EmberTrailBackground — an ambient gold "ledger" dot grid that ignites under the
 * cursor and slowly cools behind it, leaving a fading ember trail. Sits app-wide
 * behind all content, layered above the CSS aurora glow + grain (see globals.css).
 *
 * Designed to grab attention without disturbing the user:
 *  - Idle when the cursor is still AND every ember has cooled → the rAF loop stops
 *    and burns zero CPU until the next pointer move (the big battery win).
 *  - Pauses entirely when the tab is hidden.
 *  - Skips coarse-pointer / touch devices (no cursor to trail) and honours
 *    prefers-reduced-motion — both fall back to the existing static background.
 *  - pointer-events: none, so it never intercepts clicks.
 *
 * Palette matches the Ledger tokens: gold #EBBC6B, hot gold #F4D49F.
 */

const GAP = 30 // px between grid dots
const RADIUS = 150 // px ignite radius around the light
const LAG = 0.14 // light easing toward the cursor (weight/trailing feel)
// Per-frame ember decay. Tuned for a smooth ~1.5–2s dim-down (not a snap-off)
// once the cursor stops: at 60fps, heat 1 → the 0.02 cutoff takes ~1.7s with
// 0.978. Raise toward 1 for a longer, gentler fade; lower for a quicker one.
const COOL = 0.978
const REGION = 0.85 // dots fade out toward the bottom of the viewport
const MAX_DPR = 2

export default function EmberTrailBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Bail on touch/coarse-pointer devices and reduced-motion — the static
    // aurora + grain background remains and this simply never runs.
    const noCursor = window.matchMedia("(pointer: coarse)").matches
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (noCursor || reduced) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let cols = 0
    let rows = 0
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(width / GAP) + 1
      rows = Math.ceil(height / GAP) + 1
    }
    resize()

    // Raw cursor target and the lagged "light" that trails toward it.
    const mouse = { x: -9999, y: -9999 }
    const light = { x: -9999, y: -9999 }
    // Timestamp of the last pointer move — dots only ignite while the cursor is
    // actively moving, so a stationary cursor leaves its patch to cool and fade
    // out (a true cursor trail) instead of parking a permanent glowing blob.
    let lastMoveAt = -9999
    // Ember heat per grid cell, keyed "col,row". Absent = cold.
    const heat = new Map<string, number>()

    // How long after the last move dots keep igniting. Short window so the trail
    // tracks motion but doesn't strobe between individual pointer events.
    const IGNITE_WINDOW = 90 // ms

    let raf = 0
    let running = false

    const regionFade = (y: number) => Math.max(0, 1 - y / (height * REGION))

    const step = () => {
      // Ease the light toward the cursor for a weighted, trailing feel.
      if (light.x < -9000) {
        light.x = mouse.x
        light.y = mouse.y
      }
      light.x += (mouse.x - light.x) * LAG
      light.y += (mouse.y - light.y) * LAG

      ctx.clearRect(0, 0, width, height)

      let anyHot = false
      // Only ignite while the cursor is actively moving; once it stops, existing
      // heat just cools each frame and the patch fades out like the rest of the trail.
      const igniting = performance.now() - lastMoveAt < IGNITE_WINDOW

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * GAP
          const y = j * GAP
          const dx = x - light.x
          const dy = y - light.y
          const d = Math.hypot(dx, dy)
          const near = d < RADIUS ? 1 - d / RADIUS : 0
          const key = `${i},${j}`

          let hv = heat.get(key) ?? 0
          if (igniting && near > hv) hv = near // ignite (only while moving)
          hv *= COOL // cool
          if (hv < 0.02) {
            heat.delete(key)
            continue
          }
          heat.set(key, hv)
          anyHot = true

          const rf = regionFade(y)
          // Softened brightness curve. The old `hv*hv` (quadratic) made the tail
          // of the fade collapse almost instantly — the visible "snap off" when
          // the cursor stopped. `hv * (0.35 + 0.65*hv)` stays near-linear at low
          // heat (so the dim-down is gradual, not a flash) while still keeping
          // hot dots bright at high heat.
          const brightness = hv * (0.35 + 0.65 * hv)
          const alpha = brightness * 0.9 * (0.55 + rf * 0.45)
          if (alpha <= 0.008) continue
          const radius = 1 + hv * 1.7

          ctx.globalAlpha = Math.min(1, alpha)
          ctx.fillStyle = hv > 0.45 ? "#F4D49F" : "#EBBC6B"
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1

      // Still moving toward the cursor?
      const settling = Math.abs(mouse.x - light.x) > 0.5 || Math.abs(mouse.y - light.y) > 0.5

      if (anyHot || settling) {
        raf = requestAnimationFrame(step)
      } else {
        // Nothing hot, light has caught up → go idle and stop burning CPU.
        running = false
        ctx.clearRect(0, 0, width, height)
      }
    }

    const wake = () => {
      if (running || document.hidden) return
      running = true
      raf = requestAnimationFrame(step)
    }

    const onPointerMove = (e: PointerEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      lastMoveAt = performance.now()
      wake()
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        running = false
      }
      // On becoming visible we do nothing — the next pointer move wakes it.
    }

    const onResize = () => {
      resize()
      // Grid geometry changed; clear stale heat cells and repaint if active.
      heat.clear()
      if (!running) ctx.clearRect(0, 0, width, height)
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("resize", onResize)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("resize", onResize)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        // z-index 0 (not -1): a negative z-index would paint the canvas BEHIND
        // the opaque body background (#0b0c11 in globals.css), hiding it. At 0
        // it sits above the body background + aurora/grain pseudo-elements, and
        // page content in the normal flow still paints above it. pointer-events
        // none keeps it click-through.
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  )
}
