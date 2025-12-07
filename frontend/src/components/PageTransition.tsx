'use client'

import { motion } from 'motion/react'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
    filter: 'blur(8px)'
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1.0] // Ease out cubic
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(8px)',
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1.0]
    }
  }
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  )
}