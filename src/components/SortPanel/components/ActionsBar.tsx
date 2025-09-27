"use client"

import { motion } from 'framer-motion'
import { ThumbsDown, ThumbsUp, RotateCcw, Captions } from 'lucide-react'

type Props = {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  onFlip: () => void
  thumbsAnimation: 'left' | 'right' | null
  isCurrentFlipped: boolean
}

export function ActionsBar({ onSwipeLeft, onSwipeRight, onFlip, thumbsAnimation, isCurrentFlipped }: Props) {
  return (
    <div className="flex items-center justify-center gap-8 mt-24 px-4">
      {/* Thumbs down - swipe left */}
      <motion.button
        onClick={onSwipeLeft}
        className="h-12 w-12 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center transition-all duration-200"
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.95 }}
        animate={{ opacity: thumbsAnimation === 'left' ? 1 : 0.6, scale: thumbsAnimation === 'left' ? 1.24 : 1 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
      >
        <ThumbsDown className="w-6 h-6 text-red-400" />
      </motion.button>

      {/* Reverse button - flip current card */}
      <motion.button
        onClick={onFlip}
        className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200 relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Caption icon - shown initially and during animation */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ opacity: isCurrentFlipped ? 0 : 1 }}
          transition={{ duration: 0.3, delay: isCurrentFlipped ? 0.3 : 0 }}
        >
          <Captions className="w-8 h-8 text-white" />
        </motion.div>

        {/* Rotate icon - shown after animation completes */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ opacity: isCurrentFlipped ? 1 : 0, rotate: isCurrentFlipped ? 180 : 0 }}
          transition={{ duration: 0.3, delay: isCurrentFlipped ? 0.3 : 0 }}
        >
          <RotateCcw className="w-8 h-8 text-white" />
        </motion.div>
      </motion.button>

      {/* Thumbs up - swipe right */}
      <motion.button
        onClick={onSwipeRight}
        className="h-12 w-12 rounded-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 flex items-center justify-center transition-all duration-200"
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.95 }}
        animate={{ opacity: thumbsAnimation === 'right' ? 1 : 0.6, scale: thumbsAnimation === 'right' ? 1.24 : 1 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
      >
        <ThumbsUp className="w-6 h-6 text-green-400" />
      </motion.button>
    </div>
  )
}
