'use client'

import { useEffect, useRef } from 'react'

export function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let stars: { x: number; y: number; radius: number; opacity: number; speed: number }[] = []

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStars()
    }

    const initStars = () => {
      stars = []
      const starCount = Math.floor((window.innerWidth * window.innerHeight) / 3000)
      
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5,
          opacity: Math.random(),
          speed: 0.005 + Math.random() * 0.01
        })
      }
    }

    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      stars.forEach(star => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 0, 0, ${star.opacity})` // Dark stars for light mode, will invert with CSS for dark mode
        ctx.fill()

        // Twinkle effect
        star.opacity += star.speed
        if (star.opacity > 1 || star.opacity < 0.1) {
          star.speed = -star.speed
        }
      })

      animationFrameId = requestAnimationFrame(drawStars)
    }

    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()
    drawStars()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none opacity-20 dark:opacity-40 dark:invert"
    />
  )
}