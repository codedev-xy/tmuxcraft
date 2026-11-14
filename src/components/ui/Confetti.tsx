import { useState } from 'react'
import { motion } from 'framer-motion'

const COLORS = ['#f59e0b', '#0ea5e9', '#ec4899', '#10b981', '#8b5cf6', '#f97316']

interface Particle {
  id: number
  scale: number
  x: number
  y: number
  rotate: number
  duration: number
  delay: number
  width: number
  height: number
  round: boolean
  color: string
}

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    scale: Math.random() * 0.5 + 0.5,
    x: (Math.random() - 0.5) * 500,
    y: Math.random() * -300 - 100,
    rotate: Math.random() * 720 - 360,
    duration: 1.8 + Math.random() * 0.8,
    delay: Math.random() * 0.4,
    width: Math.random() * 8 + 4,
    height: Math.random() * 8 + 4,
    round: Math.random() > 0.5,
    color: COLORS[id % COLORS.length],
  }))
}

export function Confetti({ count = 18 }: { count?: number }) {
  const [particles] = useState(() => createParticles(count))

  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          aria-hidden="true"
          className="absolute"
          initial={{ opacity: 1, x: 0, y: 0, scale: p.scale }}
          animate={{ opacity: [1, 1, 0], x: p.x, y: p.y, rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.2, 0.8, 0.4, 1] }}
          style={{
            width: p.width,
            height: p.height,
            borderRadius: p.round ? '50%' : 2,
            background: p.color,
          }}
        />
      ))}
    </>
  )
}
