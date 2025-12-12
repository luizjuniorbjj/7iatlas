'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserData {
  user: {
    id: string
    email?: string
    walletAddress: string
    name?: string
    referralCode: string
    status: string
    currentLevel: number
  }
  stats: {
    balance: number
    totalEarned: number
    totalBonus: number
    referralsCount: number
    cyclesCompleted: number
    queuePosition: number
    totalInQueue: number
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [queues, setQueues] = useState<any[]>([])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')

    if (!token) {
      router.push('/auth/login')
      return
    }

    // Busca dados do usuário
    fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUserData(data.data)
        } else {
          localStorage.removeItem('accessToken')
          router.push('/auth/login')
        }
      })
      .catch(() => {
        router.push('/auth/login')
      })
      .finally(() => setLoading(false))

    // Busca filas
    fetch('/api/queues', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setQueues(data.data)
        }
      })
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="font-orbitron text-4xl gradient-text animate-pulse">
            7iATLAS
          </div>
          <p className="text-text-secondary mt-4">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!userData) return null

  const { user, stats } = userData

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-card-solid border-r border-white/10 p-6 flex flex-col">
        <div className="font-orbitron text-2xl gradient-text mb-8">7iATLAS</div>

        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="nav-item active">
            <span>🏠</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard/referrals" className="nav-item">
            <span>👥</span>
            <span>Indicações</span>
          </Link>
          <Link href="/dashboard/history" className="nav-item">
            <span>📜</span>
            <span>Histórico</span>
          </Link>
          <Link href="/dashboard/wallet" className="nav-item">
            <span>💰</span>
            <span>Carteira</span>
          </Link>
          <Link href="/dashboard/settings" className="nav-item">
            <span>⚙️</span>
            <span>Configurações</span>
          </Link>
        </nav>

        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gradient-start to-gradient-end flex items-center justify-center font-orbitron font-bold">
              {user.name?.charAt(0) || user.walletAddress.substring(2, 4).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {user.name || 'Usuário'}
              </div>
              <div className="text-xs text-green-aurora">
                Nível {user.currentLevel}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-4 py-2 text-red/80 hover:text-red transition-colors text-sm"
          >
            🚪 Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-orbitron text-2xl font-bold">Dashboard</h1>
            <p className="text-text-secondary">
              Bem-vindo de volta, {user.name?.split(' ')[0] || 'Usuário'}! 👋
            </p>
          </div>

          {user.status === 'PENDING' && (
            <div className="bg-gold/20 border border-gold/30 rounded-xl px-4 py-2 text-gold text-sm">
              ⚠️ Faça um depósito de $10 USDT para ativar sua conta
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="stat-card">
            <div className="w-12 h-12 rounded-xl bg-green-aurora/20 flex items-center justify-center text-2xl mb-4">
              💰
            </div>
            <div className="font-orbitron text-3xl font-bold text-green-aurora">
              ${stats.balance.toLocaleString()}
            </div>
            <div className="text-text-secondary text-sm">Saldo Total</div>
          </div>

          <div className="stat-card">
            <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center text-2xl mb-4">
              🎁
            </div>
            <div className="font-orbitron text-3xl font-bold text-gold">
              ${stats.totalBonus.toLocaleString()}
            </div>
            <div className="text-text-secondary text-sm">Bônus Indicação</div>
          </div>

          <div className="stat-card">
            <div className="w-12 h-12 rounded-xl bg-gradient-mid/20 flex items-center justify-center text-2xl mb-4">
              📊
            </div>
            <div className="font-orbitron text-3xl font-bold text-gradient-mid">
              #{stats.queuePosition || '-'}
            </div>
            <div className="text-text-secondary text-sm">
              Posição Nível {user.currentLevel}
            </div>
          </div>

          <div className="stat-card">
            <div className="w-12 h-12 rounded-xl bg-cyan/20 flex items-center justify-center text-2xl mb-4">
              👥
            </div>
            <div className="font-orbitron text-3xl font-bold text-cyan">
              {stats.referralsCount}
            </div>
            <div className="text-text-secondary text-sm">Indicados Ativos</div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Queue Status */}
          <div className="col-span-2 glass-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-orbitron text-lg">Sua Posição nas Filas</h2>
              <Link href="/dashboard/history" className="text-pink-star text-sm hover:underline">
                Ver histórico →
              </Link>
            </div>

            <div className="space-y-4">
              {queues.slice(0, 5).map((queue) => (
                <div
                  key={queue.level}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-xl"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-orbitron font-bold ${
                      queue.level < user.currentLevel
                        ? 'bg-green-aurora/20 text-green-aurora'
                        : queue.level === user.currentLevel
                        ? 'bg-gradient-to-r from-gradient-start to-gradient-mid text-white'
                        : 'bg-white/10 text-text-muted'
                    }`}
                  >
                    {queue.level < user.currentLevel ? '✓' : queue.level}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      Nível {queue.level} - ${queue.entryValue}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {queue.level < user.currentLevel
                        ? 'Completado'
                        : queue.level === user.currentLevel
                        ? 'Em progresso...'
                        : 'Aguardando'}
                    </div>
                  </div>
                  <div className="text-right">
                    {queue.userPosition ? (
                      <>
                        <div className="font-orbitron font-bold text-gold">
                          #{queue.userPosition}
                        </div>
                        <div className="text-xs text-text-muted">
                          de {queue.totalInQueue}
                        </div>
                      </>
                    ) : (
                      <div className="text-text-muted">—</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Referral Card */}
          <div className="glass-card p-6">
            <h2 className="font-orbitron text-lg mb-4">Seu Link de Indicação</h2>

            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <p className="text-sm text-text-secondary mb-2">Link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`https://7iatlas.com/ref/${user.referralCode}`}
                  readOnly
                  className="input-field text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://7iatlas.com/ref/${user.referralCode}`
                    )
                  }}
                  className="btn-primary px-4"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="text-center p-4 bg-gradient-to-r from-gradient-start/10 to-gradient-end/10 rounded-xl border border-gradient-mid/30">
              <div className="text-3xl mb-2">🎁</div>
              <div className="font-orbitron text-lg font-bold text-gold">
                40% de Bônus
              </div>
              <div className="text-sm text-text-secondary">
                A cada ciclo dos seus indicados
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
