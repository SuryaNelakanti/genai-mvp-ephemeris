'use client'

import { useState } from 'react'

export type Screen = 'onboarding' | 'home' | 'at-glance' | 'in-depth' | 'profile' | 'void'

interface User {
  name: string
  birthDate: Date
  birthTime: string
  birthLocation: string
  sunSign: string
  moonSign: string
  risingSign: string
  isOnboarded: boolean
}

export interface AppState {
  currentScreen: Screen
  user: User | null
  setScreen: (screen: Screen) => void
  setUser: (user: User) => void
}

export function AppRouter({ children }: { children: (state: AppState) => React.ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding')
  const [user, setUser] = useState<User | null>(null)

  const setScreen = (screen: Screen) => {
    setCurrentScreen(screen)
  }

  const handleSetUser = (userData: User) => {
    setUser(userData)
    if (userData.isOnboarded) {
      setCurrentScreen('home')
    }
  }

  return (
    <>
      {children({
        currentScreen,
        user,
        setScreen,
        setUser: handleSetUser
      })}
    </>
  )
}
