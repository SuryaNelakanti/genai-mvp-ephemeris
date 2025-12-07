'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from './ui/button'
import { useAppState } from '../context/AppStateContext'
import { User, Calendar, Settings, Eye, Sparkles, Moon, Loader2, Share2, Cpu } from 'lucide-react'
import { motion } from 'motion/react'
import { PlanetarySystem } from './PlanetarySystem'
import { astroEngine } from '../services/AstroEngine'
import { getCurrentMood, getLuckyNumber, getLuckyColor, getCurrentTransits, ZodiacSign } from '../services/ephemeris'
import { EASING } from '../lib/motion'

interface LocalHoroscopeData {
  prediction: string;
  luckyNumber: number;
  luckyColor: string;
  mood: string;
  transits: string[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.8, ease: EASING } }
}

const HOROSCOPE_CACHE_KEY = 'horoscope_cache';

export function Home() {
  const { user, setScreen, engineReady, initEngine } = useAppState()
  const [horoscope, setHoroscope] = useState<LocalHoroscopeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationTime, setGenerationTime] = useState<string>('')

  const handleShare = async () => {
    if (!horoscope) return;
    const text = `BitAstro Daily: ${horoscope.prediction}\n\nMood: ${horoscope.mood} • Lucky Color: ${horoscope.luckyColor}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BitAstro Daily Horoscope',
          text: text,
          url: window.location.href
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      // Could add toast here
    }
  }

  const generateHoroscope = useCallback(async () => {
    if (!user) return;

    // Check cache first
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${HOROSCOPE_CACHE_KEY}_${today}_${user.sunSign}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setHoroscope(JSON.parse(cached));
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    // Generate ephemeris data (instant)
    const mood = getCurrentMood();
    const luckyNumber = getLuckyNumber();
    const luckyColor = getLuckyColor(user.sunSign as ZodiacSign);
    const transits = getCurrentTransits();

    // Default prediction (will be replaced by AI if available)
    let prediction = `Today brings ${mood.toLowerCase()} energy for ${user.sunSign}. The cosmic alignments suggest a day of reflection and growth.`;

    // Try to generate with AI
    if (engineReady) {
      setGenerating(true);
      const startTime = performance.now();
      try {
        const prompt = `Horoscope for ${user.sunSign} on ${new Date().toLocaleDateString()}. Current transits: ${transits.slice(0, 2).join(', ')}. Mood: ${mood}.\n\nToday`;
        const aiPrediction = await astroEngine.generate(prompt, { maxTokens: 80, temperature: 0.9 });
        prediction = aiPrediction.trim();
        const endTime = performance.now();
        setGenerationTime(((endTime - startTime) / 1000).toFixed(2) + 's');
      } catch (e) {
        console.error('AI generation failed:', e);
      } finally {
        setGenerating(false);
      }
    }

    const data: LocalHoroscopeData = {
      prediction,
      luckyNumber,
      luckyColor,
      mood,
      transits
    };

    setHoroscope(data);
    localStorage.setItem(cacheKey, JSON.stringify(data));
    setLoading(false);
  }, [user, engineReady]);

  useEffect(() => {
    // Try to init engine if not ready
    if (!engineReady) {
      initEngine().catch(console.error);
    }
    generateHoroscope();
  }, [engineReady, initEngine, generateHoroscope]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Grain Texture */}
      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] mix-blend-overlay pointer-events-none z-50" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-8 flex items-center justify-between">
        <h1 className="text-3xl font-display italic tracking-tight text-white/90">BitAstro</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setScreen('profile')}
          className="rounded-full hover:bg-white/10 transition-colors text-white/80"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      {/* Planetary Hero Background */}
      <div className="absolute top-0 left-0 right-0 h-[600px] z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black z-10" />
        <PlanetarySystem
          sunSign={user?.sunSign}
          moonSign={user?.moonSign}
          risingSign={user?.risingSign}
        />
      </div>

      {/* Main Content */}
      <motion.main
        className="max-w-lg mx-auto px-6 pt-[500px] pb-12 space-y-12 relative z-20"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Greeting */}
        <motion.div variants={item} className="text-center space-y-4">
          <h2 className="text-6xl font-display italic font-light text-white drop-shadow-lg">
            {user?.name}
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-white/20" />
            <p className="font-mono text-[10px] tracking-[0.3em] text-white/60 uppercase">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <div className="h-px w-12 bg-white/20" />
          </div>
        </motion.div>

        {/* Big Three - Minimalist */}
        <motion.div variants={item} className="grid grid-cols-3 gap-px bg-white/10 border border-white/10">
          {[
            { label: 'SUN', sign: user?.sunSign, icon: '☉' },
            { label: 'MOON', sign: user?.moonSign, icon: '☾' },
            { label: 'ASC', sign: user?.risingSign, icon: '↑' }
          ].map((item, i) => (
            <motion.div
              key={i}
              className="p-6 text-center bg-black/40 backdrop-blur-md hover:bg-white/5 transition-colors duration-500 group cursor-default"
            >
              <span className="block font-display text-2xl text-white/40 mb-2 group-hover:text-white transition-colors">{item.icon}</span>
              <p className="font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1">{item.label}</p>
              <p className="font-display text-xl text-white/90 italic">{item.sign}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Navigation Cards - Cinematic */}
        <motion.div variants={item} className="space-y-px border border-white/10 bg-white/10">
          <motion.div className="group relative bg-black/40 backdrop-blur-md hover:bg-white/5 transition-colors duration-500">
            <Button
              variant="ghost"
              onClick={() => setScreen('at-glance')}
              className="w-full h-24 flex items-center justify-between px-8 py-0 rounded-none hover:bg-transparent"
            >
              <div className="text-left space-y-1">
                <h4 className="font-display text-3xl italic font-light text-white/90 group-hover:translate-x-2 transition-transform duration-500">At a Glance</h4>
                <p className="font-mono text-[10px] tracking-widest text-white/40 uppercase">Cosmic Weather Report</p>
              </div>
              <Eye className="h-5 w-5 text-white/20 group-hover:text-white transition-colors duration-500" />
            </Button>
          </motion.div>

          <motion.div className="group relative bg-black/40 backdrop-blur-md hover:bg-white/5 transition-colors duration-500">
            <Button
              variant="ghost"
              onClick={() => setScreen('in-depth')}
              className="w-full h-24 flex items-center justify-between px-8 py-0 rounded-none hover:bg-transparent"
            >
              <div className="text-left space-y-1">
                <h4 className="font-display text-3xl italic font-light text-white/90 group-hover:translate-x-2 transition-transform duration-500">In Depth</h4>
                <p className="font-mono text-[10px] tracking-widest text-white/40 uppercase">Full Chart Analysis</p>
              </div>
              <Calendar className="h-5 w-5 text-white/20 group-hover:text-white transition-colors duration-500" />
            </Button>
          </motion.div>

          <motion.div className="group relative bg-black/40 backdrop-blur-md hover:bg-white/5 transition-colors duration-500">
            <Button
              variant="ghost"
              onClick={() => setScreen('void')}
              className="w-full h-24 flex items-center justify-between px-8 py-0 rounded-none hover:bg-transparent"
            >
              <div className="text-left space-y-1">
                <h4 className="font-display text-3xl italic font-light text-white/90 group-hover:translate-x-2 transition-transform duration-500">The Void</h4>
                <p className="font-mono text-[10px] tracking-widest text-white/40 uppercase">Daily Reflections</p>
              </div>
              <Moon className="h-5 w-5 text-white/20 group-hover:text-white transition-colors duration-500" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Today's Insight - Quote Style */}
        <motion.div variants={item} className="pt-8">
          <div className="relative p-8 border-l border-white/20 pl-8">
            {loading ? (
              <div className="flex justify-center items-center h-20">
                <Loader2 className="h-5 w-5 animate-spin text-white/20" />
              </div>
            ) : (
              <>
                <p className="font-display text-2xl leading-relaxed italic text-white/80 mb-6">
                  "{horoscope?.prediction}"
                </p>
                <div className="flex justify-between items-end border-t border-white/10 pt-4">
                  <div className="flex flex-col gap-1">
                    <div className="font-mono text-[10px] tracking-widest text-white/40 uppercase">
                      Power Color: <span className="text-white/80" style={{ color: horoscope?.luckyColor }}>{horoscope?.luckyColor}</span>
                    </div>
                    {generationTime && (
                      <div className="flex items-center gap-1 font-mono text-[10px] tracking-widest text-green-400/80 uppercase">
                        <Cpu className="h-3 w-3" />
                        <span>Generated on-device in {generationTime}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={handleShare} className="h-8 w-8 p-0 text-white/40 hover:text-white">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <p className="font-mono text-[10px] tracking-widest text-white/40 uppercase">
                      — Daily Transmission
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.main>
    </div>
  )
}
