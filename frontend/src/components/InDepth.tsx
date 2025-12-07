'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from './ui/button'
import { useAppState } from '../context/AppStateContext'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { EASING } from '../lib/motion'
import {
  getPlanetaryPositions,
  calculateAspects,
  getCurrentTransits,
  ZodiacSign
} from '../services/ephemeris'
import { astroEngine } from '../services/AstroEngine'

interface TransitData {
  transit: string;
  description: string;
}

interface ForecastData {
  time: string;
  desc: string;
  energy: string;
}

interface DayData {
  day: string;
  desc: string;
  energy: string;
}

interface WeekData {
  week: string;
  focus: string;
  desc: string;
}

interface AnalysisData {
  theme?: string;
  overview?: string;
  transits?: TransitData[];
  forecast?: ForecastData[];
  days?: DayData[];
  weeks?: WeekData[];
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

// Time-based energy mapping
const timeToEnergy = (hour: number): string => {
  if (hour >= 5 && hour < 9) return 'Rising';
  if (hour >= 9 && hour < 12) return 'Peak';
  if (hour >= 12 && hour < 15) return 'Stable';
  if (hour >= 15 && hour < 18) return 'Waning';
  if (hour >= 18 && hour < 21) return 'Reflective';
  return 'Rest';
};

// Generate daily data from ephemeris
function generateDailyData(sign: string): AnalysisData {
  const positions = getPlanetaryPositions(new Date());
  const aspects = calculateAspects(positions);
  const transits = getCurrentTransits();

  // Build transits from actual aspects
  const transitData: TransitData[] = transits.slice(0, 3).map(t => ({
    transit: t,
    description: `This aspect influences your ${['emotional', 'mental', 'physical', 'spiritual'][Math.floor(Math.random() * 4)]} realm today.`
  }));

  // Generate forecast for different times of day
  const forecast: ForecastData[] = [
    { time: 'Morning', desc: 'Start your day with intention and clarity.', energy: timeToEnergy(8) },
    { time: 'Afternoon', desc: 'Focus on productive tasks and connections.', energy: timeToEnergy(14) },
    { time: 'Evening', desc: 'Wind down and reflect on your progress.', energy: timeToEnergy(19) },
  ];

  return { transits: transitData, forecast };
}

// Generate weekly data based on upcoming transits
function generateWeeklyData(sign: string): AnalysisData {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const days: DayData[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const positions = getPlanetaryPositions(date);
    const aspects = calculateAspects(positions);

    // Determine energy based on aspect count/type
    let energy = 'Flow';
    if (aspects.some(a => a.aspectName === 'Square' || a.aspectName === 'Opposition')) energy = 'Challenge';
    else if (aspects.some(a => a.aspectName === 'Trine' || a.aspectName === 'Sextile')) energy = 'Growth';

    days.push({
      day: dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1], // Adjust for 0-indexed Sunday
      desc: aspects.length > 0 ? `Influenced by ${aspects[0].planet1}-${aspects[0].planet2} energy.` : "A day for integration and rest.",
      energy
    });
  }

  return {
    theme: 'Transformation & Growth',
    overview: `This week invites ${sign} to embrace change and step into new possibilities. The cosmic energies support both introspection and bold action.`,
    days: days.slice(0, 5) // Show first 5 days
  };
}

// Generate monthly data
function generateMonthlyData(sign: string): AnalysisData {
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });

  const weeks: WeekData[] = [
    { week: 'Week 1', focus: 'Foundation', desc: 'Set your intentions and build the groundwork for the month ahead.' },
    { week: 'Week 2', focus: 'Expansion', desc: 'Push your boundaries and explore new territories with confidence.' },
    { week: 'Week 3', focus: 'Integration', desc: 'Process what you\'ve learned and integrate new insights into your life.' },
    { week: 'Week 4', focus: 'Completion', desc: 'Bring projects to a close and prepare for the next cycle.' },
  ];

  return {
    theme: `${currentMonth}: A Time of Awakening`,
    overview: `${currentMonth} brings powerful opportunities for ${sign} to align with your highest path. Trust the process and stay open to unexpected gifts.`,
    weeks
  };
}

export function InDepth() {
  const { user, setScreen, engineReady } = useAppState()

  const [daily, setDaily] = useState<AnalysisData | null>(null)
  const [weekly, setWeekly] = useState<AnalysisData | null>(null)
  const [monthly, setMonthly] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)

  const generateData = useCallback(async () => {
    if (!user) return;

    // Generate base data from ephemeris
    const dailyData = generateDailyData(user.sunSign);
    const weeklyData = generateWeeklyData(user.sunSign);
    const monthlyData = generateMonthlyData(user.sunSign);

    // Enhance with AI if available
    if (engineReady) {
      try {
        const weeklyTheme = await astroEngine.generate(
          `Weekly theme for ${user.sunSign}:`,
          { maxTokens: 20, temperature: 0.8 }
        );
        if (weeklyTheme.trim()) {
          weeklyData.theme = weeklyTheme.trim();
        }
      } catch (e) {
        console.error('AI enhancement failed:', e);
      }
    }

    setDaily(dailyData);
    setWeekly(weeklyData);
    setMonthly(monthlyData);
    setLoading(false);
  }, [user, engineReady]);

  useEffect(() => {
    generateData();
  }, [generateData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="font-mono text-xs text-white/40 uppercase tracking-widest">Analyzing your chart...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Grain Texture */}
      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] mix-blend-overlay pointer-events-none z-50" />

      {/* Header */}
      <header className="sticky top-0 z-50 p-8 flex items-center justify-between bg-gradient-to-b from-black to-transparent">
        <Button
          onClick={() => setScreen('home')}
          className="rounded-full hover:bg-white/10 transition-colors text-white/80 bg-transparent border-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-display italic tracking-tight text-white/90">In Depth</h1>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-6 py-8 relative z-20">
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-12 bg-transparent border-b border-white/10 rounded-none p-0 h-auto">
            <TabsTrigger
              value="daily"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white text-white/40 font-mono text-xs uppercase tracking-widest py-4 transition-all"
            >
              Daily
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white text-white/40 font-mono text-xs uppercase tracking-widest py-4 transition-all"
            >
              Weekly
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white text-white/40 font-mono text-xs uppercase tracking-widest py-4 transition-all"
            >
              Monthly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-16">
              <motion.section variants={item} className="space-y-8">
                <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Today's Transits</h2>
                <div className="space-y-8">
                  {daily?.transits?.map((transit, index) => (
                    <motion.div
                      key={index}
                      className="space-y-3"
                    >
                      <h3 className="font-display text-2xl italic text-white/90">{transit.transit}</h3>
                      <p className="font-light leading-relaxed text-white/60 text-lg">
                        {transit.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>

              <motion.section variants={item} className="space-y-8">
                <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Daily Rhythm</h2>
                <div className="space-y-px border border-white/10">
                  {daily?.forecast?.map((f, i) => (
                    <div key={i} className="flex items-start justify-between p-6 bg-white/5 border-b border-white/5 last:border-0">
                      <div className="space-y-1">
                        <p className="font-mono text-xs text-white/40 uppercase tracking-widest">{f.time}</p>
                        <p className="text-white/80 font-light">{f.desc}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-mono text-white/60 border border-white/20 px-2 py-1">{f.energy}</span>
                    </div>
                  ))}
                </div>
              </motion.section>
            </motion.div>
          </TabsContent>

          <TabsContent value="weekly">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-16">
              <motion.section variants={item} className="space-y-6">
                <h2 className="text-4xl font-display italic font-light text-white/90">{weekly?.theme}</h2>
                <p className="text-xl font-light leading-relaxed text-white/70">
                  {weekly?.overview}
                </p>
              </motion.section>

              <motion.section variants={item} className="space-y-8">
                <h3 className="font-mono text-xs tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Days to Watch</h3>
                <div className="grid gap-4">
                  {weekly?.days?.map((day, i) => (
                    <motion.div
                      key={i}
                      className="p-6 bg-white/5 border border-white/5 flex justify-between items-center hover:bg-white/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-display text-xl italic text-white/90">{day.day}</p>
                        <p className="text-sm text-white/60 font-light">{day.desc}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-mono text-white/40">{day.energy}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            </motion.div>
          </TabsContent>

          <TabsContent value="monthly">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-16">
              <motion.section variants={item} className="space-y-6">
                <h2 className="text-4xl font-display italic font-light text-white/90">{monthly?.theme}</h2>
                <p className="text-xl font-light leading-relaxed text-white/70">
                  {monthly?.overview}
                </p>
              </motion.section>

              <motion.section variants={item} className="space-y-8">
                <h3 className="font-mono text-xs tracking-widest text-white/40 uppercase border-b border-white/10 pb-2">Monthly Timeline</h3>
                <div className="relative border-l border-white/20 ml-4 space-y-12 pl-8 py-2">
                  {monthly?.weeks?.map((week, i) => (
                    <motion.div key={i} variants={item} className="relative">
                      <div className="absolute -left-[37px] top-1.5 w-4 h-4 rounded-full bg-black border border-white/40" />
                      <h4 className="font-mono text-xs text-white/40 uppercase tracking-widest mb-2">{week.week} — {week.focus}</h4>
                      <p className="text-white/80 font-display text-xl italic">{week.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            </motion.div>
          </TabsContent>
        </Tabs>

        <motion.div variants={item} className="pt-16">
          <Button
            onClick={() => setScreen('at-glance')}
            className="w-full h-16 border border-white/20 hover:bg-white hover:text-black transition-all duration-500 rounded-none font-mono text-xs uppercase tracking-widest bg-transparent text-white"
          >
            Back to At a Glance
          </Button>
        </motion.div>
      </main>
    </div>
  )
}
