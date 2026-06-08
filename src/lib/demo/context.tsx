'use client'
import { createContext, useContext, useState, useEffect } from 'react'

interface DemoContextValue {
  isDemoMode: boolean
  toggleDemo: () => void
}

const DemoContext = createContext<DemoContextValue>({ isDemoMode: false, toggleDemo: () => {} })

function readDemoModeFromStorage(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('tyrian_demo_mode') === 'true'
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    setIsDemoMode(readDemoModeFromStorage())
  }, [])

  const toggleDemo = () => {
    setIsDemoMode(prev => {
      const next = !prev
      localStorage.setItem('tyrian_demo_mode', String(next))
      return next
    })
  }

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemo }}>
      {children}
    </DemoContext.Provider>
  )
}

export const useDemoMode = () => useContext(DemoContext)
