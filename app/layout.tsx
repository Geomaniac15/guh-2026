import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import Navbar from '@/components/Navbar'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GUH 2026',
  description: 'GreatUniHack 2026 project',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='en' className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className='flex min-h-full flex-col'>
        <Suspense fallback={<nav className='h-[49px] border-b' />}>
          <Navbar />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
