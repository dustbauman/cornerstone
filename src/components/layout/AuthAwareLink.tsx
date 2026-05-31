'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  hrefLoggedIn?: string
  hrefLoggedOut?: string
  className?: string
  children: React.ReactNode
}

/** Links to dashboard when signed in, otherwise to login (or custom paths). */
export default function AuthAwareLink({
  hrefLoggedIn = '/dashboard',
  hrefLoggedOut = '/login',
  className,
  children,
}: Props) {
  const [href, setHref] = useState(hrefLoggedOut)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHref(session ? hrefLoggedIn : hrefLoggedOut)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setHref(session ? hrefLoggedIn : hrefLoggedOut)
    })
    return () => subscription.unsubscribe()
  }, [hrefLoggedIn, hrefLoggedOut])

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
