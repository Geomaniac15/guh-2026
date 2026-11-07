'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { isUnlocked } from '@/lib/appLock'

const noop = () => () => {}

// Hides its children until the app has been unlocked this session; otherwise sends you to /locked
export default function LockGate({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const router = useRouter()
  // null on the server and during hydration, then the real sessionStorage value
  const unlocked = useSyncExternalStore(noop, isUnlocked, () => null)

  useEffect(() => {
    if (unlocked === false) router.replace('/locked')
  }, [unlocked, router])

  return unlocked ? children : fallback
}
