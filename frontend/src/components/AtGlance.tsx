'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from './ui/button'
import { useAppState } from '../context/AppStateContext'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import { EASING } from '../lib/motion'
import {
  getCurrentMood,
  getCurrentTransits,
  calculateAspects,
  getPlanetaryPositions,
  ZodiacSign
} from '../services/ephemeris'
import { astroEngine } from '../services/AstroEngine'

interface LocalAtGlanceData {
  mood: string;
  scores: {
    love: number;
    work: number;
    creativity: number;
  };
  aspects: string[];
  insights: {
    love: string;
    work: string;
    creativity: string;
  };
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2
    }
  }
}

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.8, ease: EASING } }
}

// Generate scores based on planetary positions
function generateScores(sign: string): { love: number; work: number; creativity: number } {
  const positions = getPlanetaryPositions(new Date());
  const venus = positions.find(p => p.planet === 'Venus');
  const mars = positions.find(p => p.planet === 'Mars');
  const moon = positions.find(p => p.planet === 'Moon');

  // Use planetary degrees to generate pseudo-random but consistent scores
  const venusScore = Math.floor((venus?.degree || 15) % 6) + 5; // 5-10
  const marsScore = Math.floor((mars?.degree || 15) % 6) + 5;
  const moonScore = Math.floor((moon?.degree || 15) % 6) + 5;

  return {
    love: venusScore,
    work: marsScore,
    creativity: moonScore
  };
}

// Default insights (will be replaced by AI when available)
const defaultInsights = {
  love: "The stars align for meaningful connections today.",
  work: "Focus your energy on what matters most.",
  creativity: "Let your imagination guide your path forward."
};

export function AtGlance() {
  const { user, setScreen, engineReady } = useAppState()
  const [data, setData] = useState<LocalAtGlanceData | null>(null)
  const [loading, setLoading] = useState(true)

  const generateData = useCallback(async () => {
    if (!user) return;

    // Generate ephemeris data (instant)
    const mood = getCurrentMood();
    const transits = getCurrentTransits();
    const scores = generateScores(user.sunSign);

    let insights = { ...defaultInsights };

    // Try to generate insights with AI if available
    if (engineReady) {
      try {
        const lovePrompt = `Love insight for ${user.sunSign}:`;
        const workPrompt = `Career insight for ${user.sunSign}:`;
        const creativePrompt = `Creative insight for ${user.sunSign}:`;

        const [loveInsight, workInsight, creativeInsight] = await Promise.all([
          astroEngine.generate(lovePrompt, { maxTokens: 30, temperature: 0.9 }),
          astroEngine.generate(workPrompt, { maxTokens: 30, temperature: 0.9 }),
          astroEngine.generate(creativePrompt, { maxTokens: 30, temperature: 0.9 })
        ]);

        insights = {
          love: loveInsight.trim() || defaultInsights.love,
          work: workInsight.trim() || defaultInsights.work,
          creativity: creativeInsight.trim() || defaultInsights.creativity
        };
      } catch (e) {
        console.error('AI generation failed, using defaults:', e);
      }
    }

    setData({
      mood,
      scores,
      aspects: transits.slice(0, 4), // Top 4 aspects
      insights
    });
    setLoading(false);
  }, [user, engineReady]);

  useEffect(() => {
    generateData();
  }, [generateData]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="font-mono text-xs text-white/40 uppercase tracking-widest">Reading the cosmos...</p>
        </div>
      </div>
    )
  }

  const todayData = {
    date: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    overallMood: data.mood,
    loveScore: data.scores.love,
    workScore: data.scores.work,
    creativityScore: data.scores.creativity,
    aspects: data.aspects,
    insights: data.insights
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Grain Texture */}
      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] mix-blend-overlay pointer-events-none z-10" />

      {/* Header */}
      <header className="sticky top-0 z-50 p-8 flex items-center justify-between bg-gradient-to-b from-black to-transparent">
        <Button
          onClick={() => setScreen('home')}
          className="rounded-full hover:bg-white/10 transition-colors text-white/80 bg-transparent border-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-display italic tracking-tight text-white/90">At a Glance</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <motion.main
        className="max-w-lg mx-auto px-6 py-8 space-y-12 relative z-20"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Date and Mood */}
        <motion.div variants={item} className="text-center space-y-4">
          <p className="font-mono text-[10px] tracking-[0.3em] text-white/60 uppercase">{todayData.date}</p>
          <h2 className="text-5xl font-display italic font-light text-white">Today feels {todayData.overallMood.toLowerCase()}</h2>
        </motion.div>

        {/* Scores - Technical/Bar Chart Style */}
        <motion.div variants={item} className="space-y-6">
          <h3 className="font-mono text-xs tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Cosmic Energies</h3>

          <div className="space-y-6">
            {[
              { label: 'LOVE', score: todayData.loveScore },
              { label: 'WORK', score: todayData.workScore },
              { label: 'CREATIVITY', score: todayData.creativityScore }
            ].map((stat, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="font-display text-xl italic text-white/80">{stat.label}</span>
                  <span className="font-mono text-xs text-white/60">0{stat.score}/10</span>
                </div>
                <div className="h-px w-full bg-white/10 relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.score * 10}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="absolute top-0 left-0 h-full bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Active Aspects - Terminal Style */}
        <motion.div variants={item} className="space-y-4">
          <h3 className="font-mono text-xs tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Active Aspects</h3>
          <div className="space-y-px border border-white/10">
            {todayData.aspects.map((aspect, index) => (
              <motion.div
                key={index}
                variants={item}
                className="p-4 bg-white/5 border-b border-white/5 last:border-0 font-mono text-xs text-white/70 uppercase tracking-wider"
              >
                {aspect}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Insights - Editorial Style */}
        <motion.div variants={item} className="space-y-8">
          <h3 className="font-mono text-xs tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Quick Read</h3>

          <div className="grid gap-8">
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">LOVE</span>
              <p className="font-display text-xl italic text-white/80 leading-relaxed">"{todayData.insights.love}"</p>
            </div>
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">WORK</span>
              <p className="font-display text-xl italic text-white/80 leading-relaxed">"{todayData.insights.work}"</p>
            </div>
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">CREATIVITY</span>
              <p className="font-display text-xl italic text-white/80 leading-relaxed">"{todayData.insights.creativity}"</p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div variants={item} className="pt-8">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setScreen('in-depth')}
              className="w-full h-16 border border-white/20 hover:bg-white hover:text-black transition-all duration-500 rounded-none font-mono text-xs uppercase tracking-widest bg-transparent text-white"
            >
              View Detailed Analysis
            </Button>
          </motion.div>
        </motion.div>
      </motion.main>
    </div>
  )
}