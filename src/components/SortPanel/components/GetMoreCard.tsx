"use client"

import { motion } from 'framer-motion'

type Props = {
  isDisabled: boolean
  isLoading: boolean
  hasMore: boolean
  onClick: () => void
}

export function GetMoreCard({ isDisabled, isLoading, hasMore, onClick }: Props) {
  return (
    <div className="w-full h-full rounded-2xl bg-gray-600/20 border border-gray-500/30 flex items-center justify-center">
      <motion.button
        onClick={() => { if (!isDisabled) onClick() }}
        disabled={isDisabled}
        className={`w-32 h-32 rounded-full border flex items-center justify-center transition-all duration-200 ${
          isDisabled 
            ? 'bg-gray-500/20 border-gray-500/20 cursor-not-allowed' 
            : 'bg-gray-500/30 hover:bg-gray-500/50 border-gray-400/40'
        }`}
        whileHover={!isDisabled ? { scale: 1.05 } : {}}
        whileTap={!isDisabled ? { scale: 0.95 } : {}}
      >
        {isLoading ? (
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : !hasMore ? (
          <span className="text-white/50 font-medium text-sm text-center">No More Cards</span>
        ) : (
          <span className="text-white font-medium text-sm text-center">Get More Cards</span>
        )}
      </motion.button>
    </div>
  )
}

