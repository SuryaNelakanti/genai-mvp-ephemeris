'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { EASING } from '../lib/motion'
import { Textarea } from './ui/textarea'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useAppState } from '../context/AppStateContext'
import { ArrowLeft, Send, Sparkles, Book, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { format } from 'date-fns'
import { astroEngine } from '../services/AstroEngine'

interface JournalEntry {
  id: string
  date: Date
  content: string
  reflection?: string
}

const prompts = [
  "What is currently eclipsing your peace?",
  "Where do you feel the most tension in your life right now?",
  "What is a truth you are avoiding?",
  "Describe a recent coincidence that felt significant.",
  "What energy are you trying to attract this week?",
]

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

export function TheVoid() {
  const { setScreen } = useAppState()
  const [entry, setEntry] = useState('')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [activePrompt, setActivePrompt] = useState(prompts[0])
  const [isReflecting, setIsReflecting] = useState(false)

  useEffect(() => {
    // Initialize engine on mount
    astroEngine.init().catch(console.error)

    // Load entries from local storage
    const saved = localStorage.getItem('void_entries')
    if (saved) {
      try {
        setEntries(JSON.parse(saved).map((e: any) => ({ ...e, date: new Date(e.date) })))
      } catch (e) {
        console.error("Failed to parse entries", e)
      }
    } else {
      // Default entry if empty
      setEntries([{
        id: '1',
        date: new Date(Date.now() - 86400000 * 2),
        content: "I felt a strange shift today when I walked past the old library. It reminded me of Scorpio season three years ago.",
        reflection: "The past is a ghost that walks with us. Your intuition is picking up on cyclical patterns. Pay attention to what returns."
      }])
    }
  }, [])

  const handleSave = async () => {
    if (!entry.trim()) return

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date(),
      content: entry,
    }

    const updatedEntries = [newEntry, ...entries]
    setEntries(updatedEntries)
    localStorage.setItem('void_entries', JSON.stringify(updatedEntries))
    setEntry('')
    setIsReflecting(true)

    try {
      if (!astroEngine.ready) await astroEngine.init()

      const prompt = `You are a mystical, cryptic, and insightful astrological entity. Reflect on this user's journal entry: "${entry}". Provide a short, profound, and slightly abstract reflection that connects their thought to cosmic themes (stars, void, energy, cycles). Keep it under 50 words.`

      const reflection = await astroEngine.generate(prompt, { maxTokens: 60, temperature: 0.7 })

      setEntries(current => {
        const newEntries = current.map(e =>
          e.id === newEntry.id ? { ...e, reflection: reflection.trim() } : e
        )
        localStorage.setItem('void_entries', JSON.stringify(newEntries))
        return newEntries
      })
    } catch (error) {
      console.error("Reflection failed:", error)
    } finally {
      setIsReflecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col">
      {/* Grain Texture */}
      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] mix-blend-overlay pointer-events-none z-50" />

      {/* Header */}
      <header className="sticky top-0 z-50 p-8 flex items-center justify-between bg-gradient-to-b from-black to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setScreen('home')}
          className="rounded-full hover:bg-white/10 transition-colors text-white/80"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-display italic tracking-tight text-white/90">The Void</h1>
        <div className="w-10" />
      </header>

      <motion.main
        className="flex-1 max-w-lg mx-auto w-full px-6 pb-8 relative z-20"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <Tabs defaultValue="write" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-12 bg-transparent border-b border-white/10 rounded-none p-0 h-auto">
            <TabsTrigger
              value="write"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white text-white/40 font-mono text-xs uppercase tracking-widest py-4 transition-all"
            >
              Journal
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white text-white/40 font-mono text-xs uppercase tracking-widest py-4 transition-all"
            >
              Reflections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="flex-1 flex flex-col space-y-8 focus-visible:ring-0 outline-none mt-0">
            <motion.div
              variants={item}
              className="space-y-8"
            >
              <div className="p-6 bg-white/5 border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-0.5 h-full bg-white/20" />
                <p className="font-display text-xl italic text-white/80 leading-relaxed pr-8">
                  "{activePrompt}"
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 text-white/20 hover:text-white hover:text-white hover:bg-white/10 transition-all"
                  onClick={() => setActivePrompt(prompts[Math.floor(Math.random() * prompts.length)])}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <Textarea
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  placeholder="Cast your thoughts..."
                  className="min-h-[300px] p-6 resize-none font-display text-xl italic leading-relaxed bg-white/5 border-white/10 focus:border-white/30 text-white/90 placeholder:text-white/20 transition-colors rounded-none focus-visible:ring-0"
                />
                <div className="absolute bottom-4 right-4">
                  <span className="text-[10px] text-white/20 font-mono tracking-widest uppercase">
                    {entry.length} chars
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                className="w-full h-16 border border-white/20 hover:bg-white hover:text-black transition-all duration-500 rounded-none font-mono text-xs uppercase tracking-widest bg-transparent text-white"
                disabled={!entry.trim() || isReflecting}
              >
                {isReflecting ? (
                  <span className="flex items-center animate-pulse">
                    <Moon className="mr-2 h-4 w-4 animate-spin" />
                    Consulting the stars...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Send className="mr-2 h-4 w-4" />
                    Cast into The Void
                  </span>
                )}
              </Button>
            </motion.div>
          </TabsContent>

          <TabsContent value="history" className="h-full focus-visible:ring-0 outline-none mt-0">
            <ScrollArea className="h-[calc(100vh-250px)] pr-4">
              <div className="space-y-8 pb-8">
                <AnimatePresence>
                  {entries.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center space-x-2 text-[10px] text-white/40 font-mono tracking-widest uppercase">
                        <Book className="h-3 w-3" />
                        <span>{format(item.date, "MMM d, yyyy • h:mm a")}</span>
                      </div>

                      <div className="p-6 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-500">
                        <p className="font-display text-xl italic text-white/80 leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </p>
                      </div>

                      {item.reflection && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="ml-8 p-6 border-l border-white/20"
                        >
                          <div className="flex items-center space-x-2 mb-3 text-[10px] text-white/40 uppercase tracking-widest">
                            <Sparkles className="h-3 w-3" />
                            <span>Reflection</span>
                          </div>
                          <p className="font-light text-white/60 italic leading-relaxed">
                            {item.reflection}
                          </p>
                        </motion.div>
                      )}
                      <div className="w-full h-px bg-white/10 my-8" />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {entries.length === 0 && (
                  <div className="text-center py-20 text-white/20 font-display italic text-xl">
                    The void is empty.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </motion.main>
    </div>
  )
}
