import { useMemo } from 'react'

const COLORS = ['#f0c040', '#c9a227', '#22c55e', '#ef4444', '#3b82f6', '#ffffff']

// Lightweight, dependency-free confetti burst. Renders a fixed set of pieces
// once on mount and lets pure CSS animate them falling; nothing to clean up.
// Honors prefers-reduced-motion by rendering nothing.
export default function Confetti({ count = 70 }) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const pieces = useMemo(() => {
    if (prefersReduced) return []
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.8 + Math.random() * 1.4,
      bg: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 6,
      rotate: 180 + Math.random() * 540,
      drift: (Math.random() - 0.5) * 140,
    }))
  }, [count, prefersReduced])

  if (pieces.length === 0) return null

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            background: p.bg,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`,
            '--rot': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  )
}
