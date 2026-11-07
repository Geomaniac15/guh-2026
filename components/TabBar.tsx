'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const icon = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

const TABS = [
  {
    href: '/dashboard',
    label: 'Today',
    icon: (
      <svg {...icon}>
        <circle cx='12' cy='12' r='9' />
        <circle cx='12' cy='12' r='4.5' />
      </svg>
    ),
  },
  {
    href: '/rings',
    label: 'Gauges',
    icon: (
      <svg {...icon}>
        <path d='M4.5 17a8 8 0 1 1 15 0' />
        <path d='M12 14l4-5' />
        <circle cx='12' cy='14' r='1.2' />
      </svg>
    ),
  },
  {
    href: '/night',
    label: 'Night out',
    icon: (
      <svg {...icon}>
        <path d='M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' />
      </svg>
    ),
  },
  {
    href: '/connect',
    label: 'Bank',
    icon: (
      <svg {...icon}>
        <path d='M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18' />
      </svg>
    ),
  },
]

// Logged-in pages that show the bar (not /night/lock, /locked, login or landing)
const SHOW_ON = ['/dashboard', '/rings', '/night', '/widget', '/connect']

// Fixed bottom tab bar
export default function TabBar() {
  const path = usePathname()
  const visible = path !== '/night/lock' && SHOW_ON.some((p) => path === p || path.startsWith(p + '/'))
  if (!visible) return null

  return (
    <>
      {/* Spacer so page content never hides behind the bar */}
      <div aria-hidden className='h-(--tabbar-h) shrink-0' />
      <nav
        id='tabbar'
        aria-label='Main'
        className='fixed inset-x-0 bottom-0 z-40 border-t border-[#1F2430] bg-[#0B0D12] pb-[env(safe-area-inset-bottom)]'
      >
        <ul className='mx-auto grid w-full max-w-[420px] grid-cols-4'>
          {TABS.map((tab) => {
            const active = path === tab.href || path.startsWith(tab.href + '/')
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? 'text-[#F4F5F7]' : 'text-[#9AA3B2]'}`}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
