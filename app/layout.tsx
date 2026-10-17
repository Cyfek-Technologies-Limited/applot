import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Comfortaa, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const comfortaa = Comfortaa({
  subsets: ['latin'],
  variable: '--font-comfortaa',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Applot — Upload your CV once, let AI apply for you',
  description:
    'Applot finds legit jobs on trusted job boards, tailors every application to your CV, and tracks every application in one dashboard.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#060913',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${comfortaa.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
