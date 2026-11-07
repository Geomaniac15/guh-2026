import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter, Space_Grotesk } from 'next/font/google'
import Navbar from '@/components/Navbar'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ variable: '--font-space', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Runway',
  description: 'Student money, measured in days of runway',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='en' className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className='flex min-h-full flex-col'>
        <Suspense fallback={<nav className='h-[49px] border-b' />}>
          <Navbar />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
