'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'motion/react'
import * as Astronomy from 'astronomy-engine'
import { EASING } from '../lib/motion'

/**
 * Props for the PlanetarySystem component.
 */
interface PlanetarySystemProps {
  /** The user's Sun sign (e.g., "Scorpio"). */
  sunSign?: string
  /** The user's Moon sign. */
  moonSign?: string
  /** The user's Rising sign (Ascendant). */
  risingSign?: string
}

/**
 * A reusable component representing a single celestial body in the visualization.
 * Handles animations, hover effects, and atmospheric styling.
 */
const CelestialBody = ({ size, label, gradientStyle, glowColor, delay = 0, coordinates, subtext, details }: { size: number, label: string, gradientStyle: string, glowColor: string, delay?: number, coordinates: string, subtext: string, details?: string }) => {
  return (
    <div className="relative flex flex-col items-center justify-center group">
      {/* Cinematic Label - Overlapping/Large */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.2, duration: 1.5, ease: EASING }}
        className="absolute -top-16 z-30 text-center pointer-events-none mix-blend-difference"
      >
        <h3 className="font-display text-5xl text-white/90 italic tracking-tight drop-shadow-lg">
          {label}
        </h3>
      </motion.div>

      <motion.div
        className="relative flex items-center justify-center cursor-pointer"
        style={{ width: size, height: size }}
        animate={{
          y: [-5, 5, -5],
        }}
        transition={{
          duration: 8,
          ease: "easeInOut",
          repeat: Infinity,
          delay: delay
        }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Backlight / Eclipse Effect */}
        <div className={`absolute inset-[-10%] rounded-full blur-xl opacity-60 ${glowColor} transition-opacity duration-1000 group-hover:opacity-80`} />

        {/* Planet Core - Dark & Moody */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(0,0,0,0) 0%, #000 100%)', // Dark base
            boxShadow: 'inset -5px -5px 20px rgba(0,0,0,0.9), inset 2px 2px 10px rgba(255,255,255,0.2)'
          }}
        >
          {/* Texture Layer (The "Image" feel) */}
          <div
            className="absolute inset-0 opacity-80 mix-blend-overlay"
            style={{ background: gradientStyle }}
          />

          {/* Grain/Noise (Organic) */}
          <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] mix-blend-overlay" />

          {/* Rim Light (Sharp) */}
          <div className="absolute inset-0 rounded-full shadow-[inset_2px_2px_4px_rgba(255,255,255,0.4)]" />
        </div>

        {/* Hover Details Overlay */}
        {details && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 backdrop-blur-sm rounded-full">
            <p className="text-[10px] font-mono text-white text-center px-2 leading-tight">
              {details}
            </p>
          </div>
        )}
      </motion.div>

      {/* Technical Data - Bottom */}
      <div className="absolute -bottom-16 w-48 flex flex-col items-center space-y-2 z-20">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="flex justify-between w-full px-2">
          <span className="font-mono text-[10px] text-white/60 uppercase tracking-wider">
            {coordinates}
          </span>
          <span className="font-mono text-[10px] text-white/60 uppercase tracking-wider">
            {subtext}
          </span>
        </div>
      </div>
    </div>
  )
}

function getMoonPhaseName(phase: number): string {
  if (phase < 22.5) return "New Moon";
  if (phase < 67.5) return "Waxing Crescent";
  if (phase < 112.5) return "First Quarter";
  if (phase < 157.5) return "Waxing Gibbous";
  if (phase < 202.5) return "Full Moon";
  if (phase < 247.5) return "Waning Gibbous";
  if (phase < 292.5) return "Last Quarter";
  if (phase < 337.5) return "Waning Crescent";
  return "New Moon";
}

function formatCoordinate(deg: number): string {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}° ${m.toString().padStart(2, '0')}'`;
}

/**
 * The main Planetary System visualization component.
 * Renders the Sun, Moon, and Ascendant with real-time ephemeris data.
 * Features an atmospheric background with animated rain/light streaks.
 */
export function PlanetarySystem({ sunSign, moonSign, risingSign }: PlanetarySystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ephemerisData, setEphemerisData] = useState<{
    moonPhase: string;
    moonCoord: string;
    sunCoord: string;
    risingCoord: string; // Placeholder as we need location
    moonDist: string;
  }>({
    moonPhase: "Calculating...",
    moonCoord: "00° 00'",
    sunCoord: "00° 00'",
    risingCoord: "00° 00'",
    moonDist: "0 km"
  })

  useEffect(() => {
    const updateEphemeris = () => {
      const date = new Date();
      const moonPhase = Astronomy.MoonPhase(date);
      const moonPos = Astronomy.Equator(Astronomy.Body.Moon, date, new Astronomy.Observer(0, 0, 0), true, true);
      const sunPos = Astronomy.Equator(Astronomy.Body.Sun, date, new Astronomy.Observer(0, 0, 0), true, true);

      // Calculate approximate ecliptic longitude for display
      const moonLon = (moonPos.ra * 15) % 360; // Rough approx
      const sunLon = (sunPos.ra * 15) % 360;

      setEphemerisData({
        moonPhase: getMoonPhaseName(moonPhase),
        moonCoord: formatCoordinate(moonLon),
        sunCoord: formatCoordinate(sunLon),
        risingCoord: "N/A", // Requires user location
        moonDist: `${Math.round(moonPos.dist * 149597870.7).toLocaleString()} km`
      });
    };

    updateEphemeris();
    const interval = setInterval(updateEphemeris, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const streaks: { x: number, y: number, speed: number, length: number, opacity: number }[] = []

    const resize = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }

    window.addEventListener('resize', resize)
    resize()

    // Initialize streaks (Rain/Light effect)
    for (let i = 0; i < 50; i++) {
      streaks.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 2 + Math.random() * 5,
        length: 20 + Math.random() * 80,
        opacity: 0.1 + Math.random() * 0.3
      })
    }

    const animate = () => {
      const width = canvas.width
      const height = canvas.height

      ctx.clearRect(0, 0, width, height)

      // Draw Streaks (Atmospheric Rain/Light)
      ctx.save()
      ctx.rotate(-0.2) // Slanted rain
      streaks.forEach(streak => {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(255, 255, 255, ${streak.opacity})`
        ctx.lineWidth = 1
        ctx.moveTo(streak.x, streak.y)
        ctx.lineTo(streak.x, streak.y + streak.length)
        ctx.stroke()

        streak.y += streak.speed
        if (streak.y > height * 1.5) {
          streak.y = -100
          streak.x = Math.random() * width * 1.5 // Re-spawn wider due to rotation
        }
      })
      ctx.restore()

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-[600px] relative flex items-center justify-center overflow-hidden bg-black/40">
      {/* Atmospheric Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full mix-blend-screen opacity-50"
      />

      {/* Dark Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_90%)] pointer-events-none" />

      {/* Planets Container */}
      <div className="relative z-10 flex items-end justify-center gap-8 md:gap-16 pb-20">
        {/* Moon */}
        <div className="mb-12">
          <CelestialBody
            size={120}
            label={moonSign || "Moon"}
            gradientStyle="linear-gradient(135deg, #475569 0%, #1e293b 100%)"
            glowColor="bg-blue-900"
            delay={0}
            coordinates={ephemerisData.moonCoord}
            subtext={ephemerisData.moonPhase.toUpperCase()}
            details={`Dist: ${ephemerisData.moonDist}`}
          />
        </div>

        {/* Sun (Center, Largest) */}
        <div className="mb-32">
          <CelestialBody
            size={180}
            label={sunSign || "Sun"}
            gradientStyle="linear-gradient(135deg, #b45309 0%, #78350f 100%)"
            glowColor="bg-orange-900"
            delay={0.2}
            coordinates={ephemerisData.sunCoord}
            subtext="CURRENT TRANSIT"
            details="Solar Cycle 25"
          />
        </div>

        {/* Rising */}
        <div className="mb-12">
          <CelestialBody
            size={100}
            label={risingSign || "Ascendant"}
            gradientStyle="linear-gradient(135deg, #7e22ce 0%, #581c87 100%)"
            glowColor="bg-purple-900"
            delay={0.4}
            coordinates={ephemerisData.risingCoord}
            subtext="EASTERN HORIZON"
            details="Calculated from birth time"
          />
        </div>
      </div>
    </div>
  )
}
