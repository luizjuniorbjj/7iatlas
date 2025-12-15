'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Erro ao enviar email')
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
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

          <h1 className="font-orbitron text-xl font-bold mb-1">Recuperar Senha</h1>
          <p className="text-text-secondary mb-6">
            Digite seu email para receber as instruções
          </p>

          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-aurora/20 border border-green-aurora/30 rounded-xl">
                <div className="text-4xl mb-3">📧</div>
                <p className="text-green-aurora font-medium mb-2">Email enviado!</p>
                <p className="text-text-secondary text-sm">
                  Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.
                </p>
              </div>
              <Link href="/auth/login" className="btn-secondary w-full inline-block">
                ← Voltar para Login
              </Link>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red/20 border border-red/30 rounded-lg text-red text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : '📧 Enviar Instruções'}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 text-sm text-text-muted">
                Lembrou a senha?{' '}
                <Link href="/auth/login" className="text-pink-star hover:underline">
                  Fazer login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
