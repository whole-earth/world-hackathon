"use client"

import { motion } from 'framer-motion'
import type { DemoCard } from '@/components/SortPanel/types'

type Props = {
  item: DemoCard
  isTop: boolean
  isFlipped: boolean
}

export function DemoCardView({ item, isTop, isFlipped }: Props) {
  return (
    <motion.div
      className="h-full w-full rounded-2xl border border-white/10 p-5 text-white shadow-xl relative"
      style={{
        background: `linear-gradient(160deg, ${item.color} 0%, #000000 40%)`,
        boxShadow: isTop ? '0 12px 60px rgba(0,0,0,0.35)' : '0 8px 30px rgba(0,0,0,0.25)',
        transformStyle: 'preserve-3d'
      }}
      animate={{ rotateY: isFlipped ? 180 : 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {/* Front side */}
      <div
        className="absolute inset-0 p-5 flex flex-col justify-end pointer-events-none"
        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
      >
        <h3 className="text-2xl font-bold drop-shadow-sm">{item.title}</h3>
        {item.subtitle && <p className="mt-1 text-white/85">{item.subtitle}</p>}
      </div>

      {/* Back side */}
      <div
        className="absolute inset-0 p-5 overflow-y-auto pointer-events-none"
        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      >
        <div className="prose prose-invert prose-sm max-w-none">
          {item.description && (
            <div className="whitespace-pre-wrap text-white/90 leading-relaxed">
              {item.description.split('\n').map((line: string, i: number) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-xl font-bold mb-2">{line.slice(2)}</h1>
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="font-semibold mb-2">{line.slice(2, -2)}</p>
                }
                if (line.startsWith('- ')) {
                  return <li key={i} className="ml-4 mb-1">{line.slice(2)}</li>
                }
                if (line.startsWith('*') && line.endsWith('*')) {
                  return <p key={i} className="italic text-white/70 text-sm">{line.slice(1, -1)}</p>
                }
                if (line.trim() === '') {
                  return <br key={i} />
                }
                return <p key={i} className="mb-2">{line}</p>
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

