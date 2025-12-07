'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from './ui/utils'
import { useAppState } from '../context/AppStateContext'
import { motion, AnimatePresence, Variants } from 'motion/react'

const stepVariants: Variants = {
  initial: { opacity: 0, filter: 'blur(10px)' },
  animate: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease: "easeOut" } },
  exit: { opacity: 0, filter: 'blur(10px)', transition: { duration: 0.5 } }
}

export function Onboarding() {
  const { setUser, setScreen, initEngine, engineReady, engineLoading, engineError, calculateSigns } = useAppState()
  const [step, setStep] = useState(0)
  const [isCalculating, setIsCalculating] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<'signs' | 'ai' | 'done'>('signs')
  const [formData, setFormData] = useState({
    name: '',
    birthDate: null as Date | null,
    birthTime: '',
    birthLocation: ''
  })

  const steps = ['Welcome', 'Name', 'Birth Date', 'Birth Time', 'Birth Location']

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return formData.name.trim() !== ''
      case 2: return formData.birthDate !== null
      case 3: return formData.birthTime !== ''
      case 4: return formData.birthLocation.trim() !== ''
      default: return true
    }
  }

  const handleComplete = async () => {
    setIsCalculating(true)
    setLoadingPhase('signs')

    // Calculate signs using ephemeris
    await new Promise(resolve => setTimeout(resolve, 500)) // Brief delay for UX
    const signs = calculateSigns(formData.birthDate!, formData.birthTime)

    // Create user object
    const user = {
      name: formData.name,
      birthDate: formData.birthDate!,
      birthTime: formData.birthTime,
      birthLocation: formData.birthLocation,
      sunSign: signs.sunSign,
      moonSign: signs.moonSign,
      risingSign: signs.risingSign,
      isOnboarded: true
    }

    setUser(user)

    // Initialize AI engine
    setLoadingPhase('ai')
    try {
      await initEngine()
      setLoadingPhase('done')
      // Navigate to home after a brief moment
      await new Promise(resolve => setTimeout(resolve, 500))
      setScreen('home')
    } catch (e) {
      console.error('Engine init failed:', e)
      // Still navigate to home, AI will try to init later
      setScreen('home')
    }
  }

  if (isCalculating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
        {/* Grain Texture */}
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] mix-blend-overlay pointer-events-none" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-8 relative z-10"
        >
          <div className="relative w-32 h-32 mx-auto">
            <motion.div
              className="absolute inset-0 border border-white/20 rounded-full"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-4 border border-white/40 rounded-full border-dashed"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xs tracking-[0.2em] animate-pulse">
                {loadingPhase === 'signs' ? 'CALCULATING' : loadingPhase === 'ai' ? 'LOADING AI' : 'READY'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-display italic font-light">
              {loadingPhase === 'signs' ? 'Aligning the Stars' : loadingPhase === 'ai' ? 'Initializing Oracle' : 'Complete'}
            </h2>
            <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
              {loadingPhase === 'signs'
                ? 'Processing Ephemeris Data...'
                : loadingPhase === 'ai'
                  ? 'Loading Neural Network (~16MB)...'
                  : 'Your chart is ready'}
            </p>
            {engineError && (
              <p className="font-mono text-xs text-red-400 mt-4">
                AI offline: {engineError}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-background overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGheiWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] mix-blend-overlay pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background to-transparent z-10" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent z-10" />

      <div className="w-full max-w-md relative z-20">
        {/* Progress indicator (Technical) */}
        <motion.div
          className="mb-16 flex items-center justify-between border-b border-white/10 pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Sequence {step + 1}/{steps.length}
          </span>
          <div className="flex space-x-1">
            {steps.map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  "w-8 h-0.5 transition-colors duration-300",
                  i <= step ? "bg-white" : "bg-white/10"
                )}
              />
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full"
          >
            {step === 0 && <WelcomeStep onNext={nextStep} />}
            {step === 1 && (
              <NameStep
                name={formData.name}
                onNameChange={(name) => setFormData(prev => ({ ...prev, name }))}
                onNext={nextStep}
                onPrev={prevStep}
                canProceed={canProceed()}
              />
            )}
            {step === 2 && (
              <DateStep
                date={formData.birthDate}
                onDateChange={(date) => setFormData(prev => ({ ...prev, birthDate: date }))}
                onNext={nextStep}
                onPrev={prevStep}
                canProceed={canProceed()}
              />
            )}
            {step === 3 && (
              <TimeStep
                time={formData.birthTime}
                onTimeChange={(time) => setFormData(prev => ({ ...prev, birthTime: time }))}
                onNext={nextStep}
                onPrev={prevStep}
                canProceed={canProceed()}
              />
            )}
            {step === 4 && (
              <LocationStep
                location={formData.birthLocation}
                onLocationChange={(location) => setFormData(prev => ({ ...prev, birthLocation: location }))}
                onNext={nextStep}
                onPrev={prevStep}
                canProceed={canProceed()}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-12">
      <div className="space-y-6">
        <motion.h1
          className="text-6xl font-display italic font-light tracking-tighter"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 1 }}
        >
          Co—Star
        </motion.h1>
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="font-mono text-xs text-muted-foreground tracking-[0.2em] uppercase">
            System v0.1
          </p>
          <p className="text-lg font-light text-white/80 leading-relaxed max-w-xs mx-auto">
            Hyper-personalized astrological data guided by NASA ephemeris.
          </p>
        </motion.div>
      </div>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button onClick={onNext} variant="outline" className="w-full h-14 border border-white/20 hover:bg-white hover:text-black transition-all duration-500 font-mono uppercase tracking-widest text-xs">
          Initialize Sequence
        </Button>
      </motion.div>
    </div>
  )
}

interface StepProps {
  onNext: () => void
  onPrev: () => void
  canProceed: boolean
}

interface NameStepProps extends StepProps {
  name: string
  onNameChange: (name: string) => void
}

function NameStep({ name, onNameChange, onNext, onPrev, canProceed }: NameStepProps) {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h2 className="text-4xl font-display italic font-light">Identification</h2>
        <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
          Enter your designation
        </p>
      </div>

      <div className="space-y-2">
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="NAME"
          autoFocus
          className="h-16 text-2xl font-display italic border-0 border-b border-white/20 rounded-none bg-transparent focus:border-white transition-colors placeholder:text-white/20 px-0"
        />
      </div>

      <div className="flex space-x-4 pt-8">
        <Button variant="ghost" onClick={onPrev} className="flex-1 h-12 font-mono text-xs uppercase tracking-widest hover:bg-white/5">
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1 h-12 bg-white text-black hover:bg-white/90 font-mono text-xs uppercase tracking-widest rounded-none">
          Confirm
        </Button>
      </div>
    </div>
  )
}

interface DateStepProps extends StepProps {
  date: Date | null
  onDateChange: (date: Date) => void
}

function DateStep({ date, onDateChange, onNext, onPrev, canProceed }: DateStepProps) {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h2 className="text-4xl font-display italic font-light">Origin Date</h2>
        <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
          Solar return calculation
        </p>
      </div>

      <div className="space-y-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-16 justify-start text-left text-2xl font-display italic border-0 border-b border-white/20 rounded-none bg-transparent hover:border-white hover:bg-transparent transition-colors px-0",
                !date && "text-white/20"
              )}
            >
              <CalendarIcon className="mr-4 h-5 w-5 opacity-50" />
              {date ? format(date, "MMMM d, yyyy") : "SELECT DATE"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border border-white/20 rounded-none bg-black/90 backdrop-blur-xl">
            <Calendar
              mode="single"
              selected={date || undefined}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
              className="p-4"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex space-x-4 pt-8">
        <Button variant="ghost" onClick={onPrev} className="flex-1 h-12 font-mono text-xs uppercase tracking-widest hover:bg-white/5">
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1 h-12 bg-white text-black hover:bg-white/90 font-mono text-xs uppercase tracking-widest rounded-none">
          Confirm
        </Button>
      </div>
    </div>
  )
}

interface TimeStepProps extends StepProps {
  time: string
  onTimeChange: (time: string) => void
}

function TimeStep({ time, onTimeChange, onNext, onPrev, canProceed }: TimeStepProps) {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h2 className="text-4xl font-display italic font-light">Temporal Lock</h2>
        <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
          Precise arrival time
        </p>
      </div>

      <div className="space-y-2">
        <Input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="h-16 text-2xl font-display italic border-0 border-b border-white/20 rounded-none bg-transparent focus:border-white transition-colors placeholder:text-white/20 px-0"
        />
        <p className="font-mono text-[10px] text-muted-foreground uppercase pt-2">
          *Defaulting to 12:00 PM if unknown
        </p>
      </div>

      <div className="flex space-x-4 pt-8">
        <Button variant="ghost" onClick={onPrev} className="flex-1 h-12 font-mono text-xs uppercase tracking-widest hover:bg-white/5">
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1 h-12 bg-white text-black hover:bg-white/90 font-mono text-xs uppercase tracking-widest rounded-none">
          Confirm
        </Button>
      </div>
    </div>
  )
}

interface LocationStepProps extends StepProps {
  location: string
  onLocationChange: (location: string) => void
}

function LocationStep({ location, onLocationChange, onNext, onPrev, canProceed }: LocationStepProps) {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h2 className="text-4xl font-display italic font-light">Spatial Coordinates</h2>
        <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
          Birth location for house alignment
        </p>
      </div>

      <div className="space-y-2">
        <Input
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="CITY, COUNTRY"
          className="h-16 text-2xl font-display italic border-0 border-b border-white/20 rounded-none bg-transparent focus:border-white transition-colors placeholder:text-white/20 px-0"
        />
      </div>

      <div className="flex space-x-4 pt-8">
        <Button variant="ghost" onClick={onPrev} className="flex-1 h-12 font-mono text-xs uppercase tracking-widest hover:bg-white/5">
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1 h-12 bg-white text-black hover:bg-white/90 font-mono text-xs uppercase tracking-widest rounded-none">
          Finalize
        </Button>
      </div>
    </div>
  )
}