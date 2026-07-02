# TrustVox — Next.js Setup Guide

## File Structure
Drop these files into your existing Next.js project:

```
your-project/
├── src/
│   ├── app/
│   │   ├── page.tsx                ← Main landing page
│   │   └── trustvox.module.css     ← All styles (scoped, no conflicts)
│   ├── components/
│   │   └── RevealText.tsx          ← Word-by-word scroll reveal component
│   └── hooks/
│       └── useScrollReveal.ts      ← Scroll reveal hooks
```

---

## Step 1 — Copy the files
Copy the 4 files above into your project at the exact paths shown.

---

## Step 2 — Set up fonts in layout.tsx
Open your `app/layout.tsx` and add the Google Fonts:

```tsx
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['300', '500', '700', '800'],
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500'],
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

---

## Step 3 — Remove global body styles (if any conflict)
If your `globals.css` sets `background`, `color`, or `font-family` on `body`, those might
override the page styles. Either remove them or wrap the page in a div — the CSS module
already scopes everything to `.page` so conflicts are minimal.

---

## How the scroll reveal system works

### `RevealText` component
Splits a string into individual words and animates each word sliding up when
the element scrolls into view. Use for headings and eyebrow labels.

```tsx
<RevealText as="h2" className={styles.sectionTitle}>
  Everything you need to capture real feedback
</RevealText>
```

Props:
- `as` — HTML tag to render (`h1`, `h2`, `p`, etc.)
- `className` — extra CSS class
- `wordDelay` — ms between each word (default: 38)
- `threshold` — IntersectionObserver threshold (default: 0.1)

---

### `useScrollReveal` hook
For single elements that should fade+slide up on scroll.

```tsx
const ref = useScrollReveal<HTMLParagraphElement>();
<p ref={ref} className={`${styles.someClass} ${styles.revealBlock}`}>
  ...
</p>
```

---

### `useStaggerReveal` hook
For lists of elements that should cascade in with staggered delays.

```tsx
const cardRefs = useStaggerReveal<HTMLDivElement>(items.length, 90); // 90ms between cards

{items.map((item, i) => (
  <div
    key={item.id}
    ref={(el) => { cardRefs.current[i] = el; }}
    className={`${styles.card} ${styles.revealCard}`}
  >
    ...
  </div>
))}
```

---

### CSS reveal classes
Three reveal animation styles are available in the CSS module:

| Class           | Effect                              | Use for            |
|-----------------|-------------------------------------|--------------------|
| `revealText`    | Word-by-word slide up (auto-applied by RevealText) | Headings |
| `revealBlock`   | Fade + slide up from 32px below     | Paragraphs, CTAs   |
| `revealCard`    | Fade + slide up + scale from 0.97   | Cards, steps       |

All three need the `revealed` class added to trigger — the hooks handle this automatically.

---

## TypeScript note
The `RevealText` component uses `as: keyof JSX.IntrinsicElements` which requires
`@ts-expect-error` for dynamic tag rendering. This is a known TypeScript limitation
with polymorphic components and is safe to ignore.
