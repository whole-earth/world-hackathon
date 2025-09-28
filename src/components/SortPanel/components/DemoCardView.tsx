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
    // Perspective wrapper ensures proper 3D rendering
    <div className="h-full w-full" style={{ perspective: 1000 }}>
      <div
        className="h-full w-full rounded-2xl text-white shadow-xl relative overflow-hidden"
        style={{
          boxShadow: isTop
            ? '0 12px 60px rgba(0,0,0,0.35)'
            : '0 8px 30px rgba(0,0,0,0.25)',
        }}
      >
        {/* Front side (image) rotates out */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-black/100 p-5 flex flex-col justify-end pointer-events-none"
          style={{
            zIndex: isFlipped ? 1 : 2,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            backgroundImage: `url(${item.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-black/60 via-black/40 to-black/80" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold drop-shadow-sm">{item.title}</h3>
            {item.subtitle && <p className="mt-1 text-white/85">{item.subtitle}</p>}
          </div>
        </motion.div>

        {/* Back side (caption) rotates in */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-white/10 p-5 overflow-y-auto pointer-events-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
          style={{
            zIndex: isFlipped ? 2 : 1,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          initial={false}
          animate={{ rotateY: isFlipped ? 0 : -180 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <div className="prose prose-invert prose-sm max-w-none">
            {item.description && (
              <div className="whitespace-pre-wrap text-white/90 leading-relaxed">
                {item.description.split('\n').map((line: string, i: number) => {
                  if (line.startsWith('# ')) {
                    return (
                      <h1 key={i} className="text-xl font-bold mb-2">
                        {line.slice(2)}
                      </h1>
                    )
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <p key={i} className="font-semibold mb-2">
                        {line.slice(2, -2)}
                      </p>
                    )
                  }
                  if (line.startsWith('- ')) {
                    return <li key={i} className="ml-4 mb-1">{line.slice(2)}</li>
                  }
                  if (line.startsWith('*') && line.endsWith('*')) {
                    return (
                      <p key={i} className="italic text-white/70 text-sm">
                        {line.slice(1, -1)}
                      </p>
                    )
                  }
                  if (line.trim() === '') {
                    return <br key={i} />
                  }
                  return <p key={i} className="mb-2">{line}</p>
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
