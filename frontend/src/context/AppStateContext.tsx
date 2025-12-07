import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { astroEngine } from '../services/AstroEngine';
import { getSunSign, getMoonSign, getRisingSign } from '../services/ephemeris';

export type Screen = 'onboarding' | 'home' | 'at-glance' | 'in-depth' | 'profile' | 'void';

export interface User {
    name: string;
    birthDate: Date;
    birthTime: string;
    birthLocation: string;
    birthLatitude?: number;
    birthLongitude?: number;
    sunSign: string;
    moonSign: string;
    risingSign: string;
    isOnboarded: boolean;
}

interface AppState {
    currentScreen: Screen;
    user: User | null;
    engineReady: boolean;
    engineError: string | null;
    engineLoading: boolean;
    setScreen: (screen: Screen) => void;
    setUser: (user: User | null) => void;
    initEngine: () => Promise<void>;
    calculateSigns: (birthDate: Date, birthTime: string, latitude?: number) => {
        sunSign: string;
        moonSign: string;
        risingSign: string;
    };
}

const AppStateContext = createContext<AppState | undefined>(undefined);

const USER_STORAGE_KEY = 'horoscope_app_user';

export function AppStateProvider({ children }: { children: ReactNode }) {
    const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding');
    const [user, setUserState] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [engineReady, setEngineReady] = useState(false);
    const [engineError, setEngineError] = useState<string | null>(null);
    const [engineLoading, setEngineLoading] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                // Restore Date object
                parsedUser.birthDate = new Date(parsedUser.birthDate);
                setUserState(parsedUser);
                if (parsedUser.isOnboarded) {
                    setCurrentScreen('home');
                }
            } catch (e) {
                console.error('Failed to parse stored user', e);
                localStorage.removeItem(USER_STORAGE_KEY);
            }
        }
        setIsInitialized(true);
    }, []);

    const initEngine = useCallback(async () => {
        if (engineReady || engineLoading) return;

        setEngineLoading(true);
        setEngineError(null);

        try {
            await astroEngine.init();
            setEngineReady(true);
            console.log('AstroEngine ready in context');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Failed to initialize AI engine';
            setEngineError(errorMessage);
            console.error('Engine init failed:', e);
        } finally {
            setEngineLoading(false);
        }
    }, [engineReady, engineLoading]);

    const calculateSigns = useCallback((birthDate: Date, birthTime: string, latitude?: number) => {
        return {
            sunSign: getSunSign(birthDate),
            moonSign: getMoonSign(birthDate, birthTime),
            risingSign: getRisingSign(birthDate, birthTime, latitude || 0),
        };
    }, []);

    const setUser = (newUser: User | null) => {
        setUserState(newUser);
        if (newUser) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        } else {
            localStorage.removeItem(USER_STORAGE_KEY);
        }
    };

    const setScreen = (screen: Screen) => {
        setCurrentScreen(screen);
        window.scrollTo(0, 0); // Reset scroll on screen change
    };

    if (!isInitialized) {
        return null; // Or a loading spinner
    }

    return (
        <AppStateContext.Provider value={{
            currentScreen,
            user,
            engineReady,
            engineError,
            engineLoading,
            setScreen,
            setUser,
            initEngine,
            calculateSigns,
        }}>
            {children}
        </AppStateContext.Provider>
    );
}

export function useAppState() {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within an AppStateProvider');
    }
    return context;
}

