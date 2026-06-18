import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Paseban — AI Router Cloud',
  description: 'Smart gateway ke 60+ AI provider dari 1 endpoint OpenAI-compatible. Multi-key, auto-fallback, smart routing.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
