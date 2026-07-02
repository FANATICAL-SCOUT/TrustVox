// components/RevealText.tsx
// ─────────────────────────────────────────────────────────────
// Splits a string into individual words and animates each one
// sliding up (clip reveal) when the element enters the viewport.
//
// Usage:
//   <RevealText as="h2" className={styles.sectionTitle}>
//     Everything you need
//   </RevealText>
// ─────────────────────────────────────────────────────────────

'use client';

import { useEffect, useRef } from 'react';
import styles from '../app/trustvox.module.css';

interface RevealTextProps {
  children: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  wordDelay?: number; // ms between each word (default: 38)
  threshold?: number;
}

export default function RevealText({
  children,
  as: Tag = 'p',
  className = '',
  wordDelay = 38,
  threshold = 0.1,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);

  // Split text into word spans on mount
  const words = children.split(/(\s+)/);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Stagger each .word span
    const wordEls = el.querySelectorAll<HTMLElement>(`.${styles.word}`);
    wordEls.forEach((w, i) => {
      w.style.transitionDelay = `${i * wordDelay}ms`;
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(styles.revealed);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -48px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [wordDelay, threshold]);

  return (
    // @ts-expect-error dynamic tag
    <Tag ref={ref} className={`${styles.revealText} ${className}`}>
      {words.map((w, i) =>
        w.trim() === '' ? (
          // preserve whitespace between words
          <span key={i}> </span>
        ) : (
          <span key={i} className={styles.wordWrap}>
            <span className={styles.word}>{w}</span>
          </span>
        )
      )}
    </Tag>
  );
}
