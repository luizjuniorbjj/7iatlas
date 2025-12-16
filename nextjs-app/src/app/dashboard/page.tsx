'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PositionCard from '@/components/matrix/PositionCard'

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

interface QuotaSummary {
  totalQuotas: number
  levels: { level: number; count: number }[]
}

interface JupiterPoolData {
  balance: number
  todayDeposits: number
  todayWithdrawals: number
}

interface ActivityItem {
  id: string
  type: 'cycle' | 'bonus' | 'referral' | 'transfer'
  title: string
  amount?: number
  timestamp: Date
  status?: string
}

// Função para calcular faixa de bônus
function getBonusTier(referralsCount: number): { percent: number; label: string; color: string } {
  if (referralsCount >= 10) {
    return { percent: 40, label: '40%', color: 'text-green-aurora' }
  } else if (referralsCount >= 5) {
    return { percent: 20, label: '20%', color: 'text-gold' }
  }
  return { percent: 0, label: '0%', color: 'text-red' }
}

// Função para próxima faixa
function getNextTier(referralsCount: number): { needed: number; percent: number } | null {
  if (referralsCount < 5) {
    return { needed: 5 - referralsCount, percent: 20 }
  } else if (referralsCount < 10) {
    return { needed: 10 - referralsCount, percent: 40 }
  }
  return null
}

export default function DashboardPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [queues, setQueues] = useState<any[]>([])
  const [quotaSummary, setQuotaSummary] = useState<QuotaSummary | null>(null)
  const [jupiterPool, setJupiterPool] = useState<JupiterPoolData | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [notifications, setNotifications] = useState(0)

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

    // Busca resumo de cotas
    fetch('/api/quotas', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.quotas) {
          // data.quotas é um objeto agrupado por nível: { 1: [...], 2: [...] }
          const levelCounts: Record<number, number> = {}
          let totalQuotas = 0

          Object.entries(data.quotas).forEach(([level, quotas]: [string, any]) => {
            const count = Array.isArray(quotas) ? quotas.length : 0
            levelCounts[parseInt(level)] = count
            totalQuotas += count
          })

          setQuotaSummary({
            totalQuotas,
            levels: Object.entries(levelCounts).map(([level, count]) => ({
              level: parseInt(level),
              count: count as number,
            })),
          })
        }
      })

    // Busca Jupiter Pool
    fetch('/api/jupiter-pool/balance', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setJupiterPool(data.data)
        }
      })
      .catch(() => {
        // Mock data se API não existir ainda
        setJupiterPool({
          balance: 15420.50,
          todayDeposits: 320,
          todayWithdrawals: 70,
        })
      })

    // Busca atividades recentes
    fetch('/api/activities/recent', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActivities(data.data)
        }
      })
      .catch(() => {
        // Mock data se API não existir ainda
        setActivities([
          { id: '1', type: 'cycle', title: 'Ciclo Completado - Nível 3', amount: 72, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
          { id: '2', type: 'bonus', title: 'Bônus - Maria Santos ciclou', amount: 14.40, timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) },
          { id: '3', type: 'referral', title: 'Novo indicado - Carlos Lima', status: 'Ativo', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          { id: '4', type: 'cycle', title: 'Ciclo Completado - Nível 2', amount: 36, timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          { id: '5', type: 'bonus', title: 'Bônus - Pedro Costa ciclou', amount: 7.20, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ])
      })

    // Busca notificações não lidas
    fetch('/api/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNotifications(data.count)
        }
      })
      .catch(() => {
        setNotifications(3) // Mock
      })
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    router.push('/auth/login')
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `Há ${days} dia${days > 1 ? 's' : ''}`
    if (hours > 0) return `Há ${hours} hora${hours > 1 ? 's' : ''}`
    return 'Agora'
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cycle': return '🔄'
      case 'bonus': return '🎁'
      case 'referral': return '👤'
      case 'transfer': return '💸'
      default: return '📌'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'cycle': return 'bg-green-aurora/20'
      case 'bonus': return 'bg-gold/20'
      case 'referral': return 'bg-cyan/20'
      case 'transfer': return 'bg-gradient-mid/20'
      default: return 'bg-white/10'
    }
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
  const bonusTier = getBonusTier(stats.referralsCount)
  const nextTier = getNextTier(stats.referralsCount)

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
          <Link href="/dashboard/quotas" className="nav-item">
            <span>🎫</span>
            <span>Cotas</span>
          </Link>
          <Link href="/dashboard/matrix" className="nav-item">
            <span>📊</span>
            <span>Matriz</span>
          </Link>
          <Link href="/dashboard/transfers" className="nav-item">
            <span>💸</span>
            <span>Transferências</span>
          </Link>
          <Link href="/dashboard/referrals" className="nav-item">
            <span>👥</span>
            <span>Indicações</span>
          </Link>
          <Link href="/dashboard/notifications" className="nav-item">
            <span>🔔</span>
            <span>Notificações</span>
          </Link>
          <Link href="/dashboard/jupiter-pool" className="nav-item">
            <span>🪐</span>
            <span>Jupiter Pool</span>
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
                Nível {user.currentLevel} • Pioneer
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

          <div className="flex items-center gap-4">
            {user.status === 'PENDING' && (
              <div className="bg-gold/20 border border-gold/30 rounded-xl px-4 py-2 text-gold text-sm">
                ⚠️ Faça um depósito de $10 USDT para ativar sua conta
              </div>
            )}

            {/* Notification Bell */}
            <Link href="/dashboard/notifications" className="relative">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                🔔
              </div>
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red rounded-full text-xs flex items-center justify-center font-bold">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Stats Grid - 4 principais + Jupiter Pool mini */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-green-aurora/20 flex items-center justify-center text-xl mb-3">
              💰
            </div>
            <div className="font-orbitron text-2xl font-bold text-green-aurora">
              ${stats.balance.toLocaleString()}
            </div>
            <div className="text-text-secondary text-xs">Saldo Total</div>
            <div className="text-green-aurora text-xs mt-1">↑ +$320 esta semana</div>
          </div>

          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-xl mb-3">
              🎁
            </div>
            <div className="font-orbitron text-2xl font-bold text-gold">
              ${stats.totalBonus.toLocaleString()}
            </div>
            <div className="text-text-secondary text-xs">Bônus Indicação</div>
            <div className="text-gold text-xs mt-1">↑ +$80 esta semana</div>
          </div>

          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-gradient-mid/20 flex items-center justify-center text-xl mb-3">
              📊
            </div>
            <div className="font-orbitron text-2xl font-bold text-gradient-mid">
              #{stats.queuePosition || 23}
            </div>
            <div className="text-text-secondary text-xs">Posição Nível {user.currentLevel}</div>
          </div>

          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-cyan/20 flex items-center justify-center text-xl mb-3">
              👥
            </div>
            <div className="font-orbitron text-2xl font-bold text-cyan">
              {stats.referralsCount}
            </div>
            <div className="text-text-secondary text-xs">Indicados Ativos</div>
            <div className="text-cyan text-xs mt-1">↑ +2 esta semana</div>
          </div>
        </div>

        {/* Jupiter Pool Mini Card */}
        <div className="glass-card p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center text-2xl">
              🪐
            </div>
            <div>
              <div className="text-sm text-text-secondary">Jupiter Pool - Fundo de Liquidez</div>
              <div className="font-orbitron text-xl font-bold">
                ${jupiterPool?.balance.toLocaleString() || '0'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-green-aurora">▲ +${jupiterPool?.todayDeposits || 0}</div>
              <div className="text-text-secondary text-xs">hoje</div>
            </div>
            <div className="text-center">
              <div className="text-gold">▼ -${jupiterPool?.todayWithdrawals || 0}</div>
              <div className="text-text-secondary text-xs">injetado</div>
            </div>
            <Link href="/dashboard/jupiter-pool" className="text-pink-star hover:underline">
              Ver detalhes →
            </Link>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Suas Posições nas Filas */}
          <div className="col-span-2">
            <div className="glass-card p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-orbitron text-lg">Sua Posição nas Filas</h2>
                <Link href="/dashboard/matrix" className="text-pink-star text-sm hover:underline">
                  Ver histórico →
                </Link>
              </div>

              {/* Nível atual destacado */}
              <div className="bg-gradient-to-r from-gradient-start/10 to-gradient-end/10 border border-gradient-mid/30 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-sm font-medium">
                    ⭐ Nível {user.currentLevel}
                  </span>
                  <div className="text-right">
                    <div className="font-orbitron text-lg font-bold text-gold">
                      ${10 * Math.pow(2, user.currentLevel)}
                    </div>
                    <div className="text-xs text-text-secondary">Ganho por ciclo</div>
                  </div>
                </div>

                <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-aurora to-gradient-mid rounded-full transition-all"
                    style={{ width: `${Math.min((stats.queuePosition / (stats.totalInQueue || 156)) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Posição #{stats.queuePosition || 23} de {stats.totalInQueue || 156}</span>
                  <span className="text-gold">~2 dias para ciclar</span>
                </div>
              </div>

              {/* Níveis completados */}
              <div className="space-y-3">
                {[1, 2, 3].filter(l => l < user.currentLevel).map((level) => (
                  <div key={level} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-aurora/20 flex items-center justify-center text-green-aurora">
                        ✓
                      </div>
                      <div>
                        <div className="font-medium">Nível {level} - ${10 * Math.pow(2, level - 1)}</div>
                        <div className="text-xs text-text-secondary">Completado em 12/12/2025</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-aurora font-medium">Ciclado</div>
                      <div className="text-xs text-text-secondary">+${10 * Math.pow(2, level)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-4">
              <Link
                href="/dashboard/quotas"
                className="glass-card p-4 hover:border-gradient-mid/50 transition-colors group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-cyan/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform mb-2">
                    🎫
                  </div>
                  <div className="font-medium text-sm">Comprar Cotas</div>
                </div>
              </Link>

              <Link
                href="/dashboard/matrix"
                className="glass-card p-4 hover:border-gradient-mid/50 transition-colors group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-mid/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform mb-2">
                    📊
                  </div>
                  <div className="font-medium text-sm">Ver Matriz</div>
                </div>
              </Link>

              <Link
                href="/dashboard/transfers"
                className="glass-card p-4 hover:border-gradient-mid/50 transition-colors group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-green-aurora/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform mb-2">
                    💸
                  </div>
                  <div className="font-medium text-sm">Transferir</div>
                </div>
              </Link>

              <Link
                href="/dashboard/referrals"
                className="glass-card p-4 hover:border-gradient-mid/50 transition-colors group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform mb-2">
                    👥
                  </div>
                  <div className="font-medium text-sm">Indicar</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Atividade Recente */}
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-orbitron text-lg">Atividade Recente</h2>
                <Link href="/dashboard/history" className="text-pink-star text-sm hover:underline">
                  Ver tudo →
                </Link>
              </div>

              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${getActivityColor(activity.type)} flex items-center justify-center text-lg`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{activity.title}</div>
                      <div className="text-xs text-text-secondary">{formatTimeAgo(activity.timestamp)}</div>
                    </div>
                    <div className="text-right">
                      {activity.amount ? (
                        <div className="text-green-aurora font-medium">+${activity.amount.toFixed(2)}</div>
                      ) : (
                        <div className="text-cyan text-sm">{activity.status}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Referral Card com Bônus Variável */}
            <div className="glass-card p-6">
              <h2 className="font-orbitron text-lg mb-4">Seu Link de Indicação</h2>

              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <p className="text-sm text-text-secondary mb-2">Link:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`https://7iatlas.ai/ref/${user.referralCode}`}
                    readOnly
                    className="input-field text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `https://7iatlas.ai/ref/${user.referralCode}`
                      )
                    }}
                    className="btn-primary px-4"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* Bônus Variável Info */}
              <div className="p-4 bg-gradient-to-r from-gradient-start/10 to-gradient-end/10 rounded-xl border border-gradient-mid/30 mb-4">
                <div className="text-center mb-3">
                  <div className="text-3xl mb-2">🎁</div>
                  <div className={`font-orbitron text-2xl font-bold ${bonusTier.color}`}>
                    {bonusTier.label} de Bônus
                  </div>
                  <div className="text-sm text-text-secondary">
                    Você tem {stats.referralsCount} indicados ativos
                  </div>
                </div>

                {nextTier && (
                  <div className="text-center text-sm mt-2 p-2 bg-white/5 rounded-lg">
                    <span className="text-text-secondary">Faltam </span>
                    <span className="text-gold font-bold">{nextTier.needed}</span>
                    <span className="text-text-secondary"> indicados para </span>
                    <span className="text-green-aurora font-bold">{nextTier.percent}%</span>
                  </div>
                )}
              </div>

              {/* Regras de Bônus */}
              <div className="text-xs text-text-secondary space-y-1">
                <div className="flex justify-between">
                  <span>0-4 indicados:</span>
                  <span className="text-red">0%</span>
                </div>
                <div className="flex justify-between">
                  <span>5-9 indicados:</span>
                  <span className="text-gold">20%</span>
                </div>
                <div className="flex justify-between">
                  <span>10+ indicados:</span>
                  <span className="text-green-aurora">40%</span>
                </div>
              </div>

              {/* Cotas resumo */}
              {quotaSummary && quotaSummary.totalQuotas > 0 && (
                <div className="bg-white/5 rounded-xl p-4 mt-4">
                  <div className="text-sm text-text-secondary mb-2">
                    Suas Cotas por Nível:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quotaSummary.levels.map((l) => (
                      <div
                        key={l.level}
                        className="px-3 py-1 bg-cyan/20 text-cyan text-sm rounded-full"
                      >
                        N{l.level}: {l.count}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
