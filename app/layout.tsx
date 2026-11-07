import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import TabBar from '@/components/TabBar'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ variable: '--font-space', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Odo',
  description: 'Your loan, counted in days',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  // iPhone "Add to Home Screen" opens full screen with a dark status bar
  appleWebApp: { capable: true, title: 'Odo', statusBarStyle: 'black' },
  other: { 'apple-mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: '#0B0D12',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='en' className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      {/* Browser extensions (e.g. Grammarly) add attributes to body before React loads */}
      <body className='flex min-h-full flex-col' suppressHydrationWarning>
        {children}
        <TabBar />
      </body>
    </html>
  )
}
