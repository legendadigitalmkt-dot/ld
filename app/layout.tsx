import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LD Growth OS',
  description: 'AI Growth Operating System by Legenda Digital',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
