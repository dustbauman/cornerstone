'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import ProfileAvatar from '@/components/ui/ProfileAvatar'

interface Props {
  userLabel: string
  onSignOut: () => void
}

export default function UserAccountMenu({ userLabel, onSignOut }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const settingsActive = pathname.startsWith('/settings')

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 text-white/90 text-sm rounded-lg py-1 pr-1 pl-1 hover:bg-white/10 transition-colors max-w-[220px]"
      >
        <ProfileAvatar name={userLabel} size="sm" tone="inverse" />
        <span className="font-medium truncate">{userLabel}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-2 min-w-[180px] bg-[#162238] border border-white/10 rounded-xl shadow-lg py-1.5 z-50"
        >
          <Link
            href="/settings"
            role="menuitem"
            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
              settingsActive
                ? 'text-[#C9A84C] bg-white/5'
                : 'text-white/85 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings size={15} className="flex-shrink-0" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/85 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut size={15} className="flex-shrink-0" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
