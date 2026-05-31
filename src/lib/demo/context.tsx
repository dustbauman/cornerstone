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
      <DemoToggle isDemoMode={isDemoMode} onToggle={toggleDemo} />
    </DemoContext.Provider>
  )
}

export const useDemoMode = () => useContext(DemoContext)

function DemoToggle({ isDemoMode, onToggle }: { isDemoMode: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: '8px',
        background: isDemoMode ? '#C9A84C' : '#1B2A4A',
        color: isDemoMode ? '#1B2A4A' : '#C9A84C',
        border: 'none', borderRadius: '24px',
        padding: '8px 16px', cursor: 'pointer',
        fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500, letterSpacing: '0.05em',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        transition: 'all 0.2s',
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: isDemoMode ? '#1B2A4A' : '#C9A84C',
        flexShrink: 0,
      }} />
      {isDemoMode ? 'DEMO MODE' : 'LIVE MODE'}
    </button>
  )
}
