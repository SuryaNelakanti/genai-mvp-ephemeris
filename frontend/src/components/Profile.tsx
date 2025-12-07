'use client'

import { Button } from './ui/button'
import { useAppState } from '../context/AppStateContext'
import { ArrowLeft, User, Calendar, MapPin, Clock, LogOut } from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'motion/react'

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
  show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
}

export function Profile() {
  const { user, setScreen, setUser } = useAppState()

  const handleSignOut = () => {
    setUser({
      name: '',
      birthDate: new Date(),
      birthTime: '',
      birthLocation: '',
      sunSign: '',
      moonSign: '',
      risingSign: '',
      isOnboarded: false
    })
    setScreen('onboarding')
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-6 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScreen('home')}
            className="mr-4 hover:bg-accent/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-light tracking-wide">Profile</h1>
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        className="max-w-md mx-auto px-6 py-8 space-y-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* User Info */}
        <motion.div variants={item} className="text-center space-y-4">
          <motion.div
            className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <User className="h-8 w-8 text-muted-foreground" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-light">{user?.name}</h2>
            <p className="text-muted-foreground font-light">
              {user?.sunSign} Sun • {user?.moonSign} Moon • {user?.risingSign} Rising
            </p>
          </div>
        </motion.div>

        {/* Birth Details */}
        <motion.section variants={item} className="space-y-6">
          <h3 className="text-lg font-medium tracking-wide">Birth Details</h3>
          <div className="space-y-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-4 p-4 bg-muted/50 backdrop-blur-sm border border-transparent hover:border-border transition-colors"
            >
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-sans tracking-wider text-muted-foreground uppercase">Date</p>
                <p className="font-medium">
                  {user?.birthDate && format(user.birthDate, "MMMM d, yyyy")}
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-4 p-4 bg-muted/50 backdrop-blur-sm border border-transparent hover:border-border transition-colors"
            >
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-sans tracking-wider text-muted-foreground uppercase">Time</p>
                <p className="font-medium">{user?.birthTime}</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-4 p-4 bg-muted/50 backdrop-blur-sm border border-transparent hover:border-border transition-colors"
            >
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-sans tracking-wider text-muted-foreground uppercase">Location</p>
                <p className="font-medium">{user?.birthLocation}</p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Natal Chart Info */}
        <motion.section variants={item} className="space-y-6">
          <h3 className="text-lg font-medium tracking-wide">Your Chart</h3>
          <div className="p-6 bg-muted/30 border border-border space-y-4 backdrop-blur-sm">
            <p className="font-light leading-relaxed">
              Your natal chart is a snapshot of the sky at the exact moment and location of your birth.
              It reveals your cosmic blueprint—the energetic patterns that influence your personality,
              relationships, and life path.
            </p>
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-2 border-t border-border/50">
              <span>Planetary Ephemeris: DE440</span>
              <span>Precision: ±0.001°</span>
            </div>
          </div>
        </motion.section>

        {/* App Info */}
        <motion.section variants={item} className="space-y-6">
          <h3 className="text-lg font-medium tracking-wide">About</h3>
          <div className="space-y-4 text-sm text-muted-foreground font-light">
            <p>
              BitAstro runs entirely on your device using WebAssembly and quantized LLMs.
              No personal data ever leaves your browser.
            </p>
            <p>
              We combine NASA's JPL ephemeris data with our custom BitAstro-8M model
              running locally on your device. No data ever leaves your browser.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="bg-muted/50 p-2 rounded text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Model</div>
                <div className="font-mono text-xs">BitAstro-8M</div>
              </div>
              <div className="bg-muted/50 p-2 rounded text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Inference</div>
                <div className="font-mono text-xs">On-Device (WASM)</div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Sign Out */}
        <motion.div variants={item} className="pt-8">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full h-12 border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 rounded-none"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </motion.div>
        </motion.div>
      </motion.main>
    </div>
  )
}