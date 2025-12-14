import type { Metadata } from 'next'
import { Inter, Orbitron } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' })

export const metadata: Metadata = {
  title: '7iATLAS - Sistema de Redistribuição Progressiva',
  description: 'A Solução que Veio do Cosmos - Sistema de redistribuição de renda inspirado na física orbital',
  keywords: ['7iATLAS', 'redistribuição', 'blockchain', 'BSC', 'USDT'],
  authors: [{ name: '7iATLAS Team' }],
  manifest: '/manifest.json',
  themeColor: '#0a0a0f',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${orbitron.variable} font-inter bg-bg-dark text-white min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
