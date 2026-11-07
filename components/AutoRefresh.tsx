'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Re-fetches the server component data every `seconds` (used by the night out lock screen)
export default function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
  return null
}
