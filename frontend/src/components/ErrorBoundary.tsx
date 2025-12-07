'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './ui/button'
import { RefreshCcw, AlertTriangle } from 'lucide-react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
        // Here you would typically log to a service like Sentry
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null })
        window.location.reload()
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black flex items-center justify-center p-6">
                    <div className="max-w-md w-full space-y-8 text-center">
                        {/* Glitchy Error Icon */}
                        <div className="relative inline-block">
                            <AlertTriangle className="h-16 w-16 text-red-500/80 mx-auto" />
                            <AlertTriangle className="h-16 w-16 text-blue-500/80 mx-auto absolute top-0 left-0 animate-pulse mix-blend-screen" style={{ transform: 'translate(-2px, 0)' }} />
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-3xl font-display italic text-white">System Malfunction</h1>
                            <p className="font-mono text-xs text-white/60 uppercase tracking-widest">
                                The cosmic alignment has been disrupted.
                            </p>
                            {this.state.error && (
                                <div className="p-4 bg-white/5 border border-white/10 rounded text-left overflow-auto max-h-32">
                                    <p className="font-mono text-[10px] text-red-400">
                                        {this.state.error.toString()}
                                    </p>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={this.handleReset}
                            className="w-full h-12 border border-white/20 hover:bg-white hover:text-black transition-all duration-300 font-mono text-xs uppercase tracking-widest bg-transparent text-white gap-2"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Realign System
                        </Button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
