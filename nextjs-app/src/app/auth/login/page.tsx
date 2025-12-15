'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'email' | 'wallet'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState(DEMO_MODE ? 'demo@7iatlas.ai' : '')
  const [password, setPassword] = useState(DEMO_MODE ? 'demo123' : '')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Erro ao fazer login')
        return
      }

      // Salva token
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)

      // Redireciona para dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleWalletLogin = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask não detectado. Por favor, instale a extensão.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Solicita conexão
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
      const walletAddress = accounts[0]

      // Gera mensagem com timestamp
      const message = `Login 7iATLAS: ${Date.now()}`

      // Solicita assinatura
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      })

      // Envia para API
      const res = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature, message }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Erro ao fazer login')
        return
      }

      // Salva token
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)

      // Redireciona
      router.push('/dashboard')
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Conexão rejeitada pelo usuário')
      } else {
        setError('Erro ao conectar. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(47,0,255,0.15)_0%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="7iATLAS"
              width={200}
              height={67}
              priority
            />
          </div>
          <p className="text-text-secondary mb-6">Entre na sua conta</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
            <button
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'email'
                  ? 'bg-gradient-to-r from-gradient-start to-gradient-mid text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
              onClick={() => setActiveTab('email')}
            >
              📧 Email
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'wallet'
                  ? 'bg-gradient-to-r from-gradient-start to-gradient-mid text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
              onClick={() => setActiveTab('wallet')}
            >
              🦊 MetaMask
            </button>
          </div>

          {/* Demo Mode Banner */}
          {DEMO_MODE && (
            <div className="mb-4 p-3 bg-cyan/20 border border-cyan/30 rounded-lg text-cyan text-sm">
              <strong>Modo Demo Ativo</strong><br />
              Email: demo@7iatlas.ai | Senha: demo123
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red/20 border border-red/30 rounded-lg text-red text-sm">
              {error}
            </div>
          )}

          {/* Email Form */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="text-left">
                <label className="text-sm text-text-secondary block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="text-left">
                <label className="text-sm text-text-secondary block mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? 'Entrando...' : '🔑 Entrar'}
              </button>
            </form>
          )}

          {/* Wallet Login */}
          {activeTab === 'wallet' && (
            <div className="space-y-4">
              <button
                onClick={handleWalletLogin}
                className="w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-orbitron font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? 'Conectando...' : '🦊 Conectar MetaMask'}
              </button>
              <p className="text-text-muted text-sm">
                Conecte sua carteira MetaMask para acessar de forma segura.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-sm text-text-muted">
            Não tem conta?{' '}
            <Link href="/auth/register" className="text-pink-star hover:underline">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
    }
  }
}
