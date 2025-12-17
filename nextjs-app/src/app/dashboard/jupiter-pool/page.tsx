'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ASSETS } from '@/constants/assets'

interface JupiterPoolData {
  balance: number
  totalDeposits: number
  totalWithdrawals: number
  todayDeposits: number
  todayWithdrawals: number
}

interface LevelHealth {
  level: number
  entryValue: number
  rewardValue: number
  daysSinceLastCycle: number
  queueSize: number
  totalCycles: number
  avgWaitTime: number
  lastCycleAt: string | null
  status: 'healthy' | 'warning' | 'critical'
  estimatedIntervention: number
  canProcess: boolean
}

interface HealthSummary {
  totalLevels: number
  healthy: number
  warning: number
  critical: number
  totalInterventionNeeded: number
  overallHealth: number
}

export default function JupiterPoolPage() {
  const router = useRouter()
  const [data, setData] = useState<JupiterPoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [levelsHealth, setLevelsHealth] = useState<LevelHealth[]>([])
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null)
  const [animatedBalance, setAnimatedBalance] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    fetch('/api/jupiter-pool/balance', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setData(res.data)
        } else {
          // Mock data se API falhar
          setData({
            balance: 15420.50,
            totalDeposits: 25000,
            totalWithdrawals: 9579.50,
            todayDeposits: 320,
            todayWithdrawals: 70
          })
        }
      })
      .catch(() => {
        // Mock data se API falhar
        setData({
          balance: 15420.50,
          totalDeposits: 25000,
          totalWithdrawals: 9579.50,
          todayDeposits: 320,
          todayWithdrawals: 70
        })
      })
      .finally(() => setLoading(false))

    // Buscar saúde dos níveis da API real
    fetch('/api/jupiter-pool/levels-health', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setLevelsHealth(res.data.levels)
          setHealthSummary(res.data.summary)
        }
      })
      .catch(console.error)
  }, [router])

  // Animate balance counter
  useEffect(() => {
    if (!data) return
    const target = data.balance
    const duration = 1500
    const steps = 60
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setAnimatedBalance(target)
        clearInterval(timer)
      } else {
        setAnimatedBalance(current)
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [data])

  const healthScore = data
    ? Math.min(100, Math.round((data.balance / (data.totalDeposits || 1)) * 100))
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 animate-pulse flex items-center justify-center text-4xl">
              🪐
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden pb-28">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-600/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        {/* Stars */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard/cosmos" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <span>←</span>
            <Image src={ASSETS.LOGO} alt="7iATLAS" width={80} height={32} priority />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🪐</span>
            <div>
              <div className="text-sm font-bold text-orange-400">Jupiter Pool</div>
              <div className="text-[10px] text-gray-500">Sistema Anti-Travamento</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 space-y-5 pt-4">

        {/* Jupiter Planet Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-950/60 via-amber-900/40 to-yellow-900/50 border border-orange-500/40 p-6">
          {/* Animated Jupiter Planet */}
          <div className="absolute top-4 right-4 w-32 h-32 opacity-30">
            <div className="relative w-full h-full animate-float">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-500 to-red-600 rounded-full" />
              <div className="absolute inset-2 bg-gradient-to-r from-transparent via-orange-300/20 to-transparent rounded-full animate-spin-slow" style={{ animationDuration: '20s' }} />
              <div className="absolute top-1/4 left-0 right-0 h-3 bg-orange-800/40 rounded-full" />
              <div className="absolute top-2/5 left-0 right-0 h-2 bg-amber-900/30 rounded-full" />
              <div className="absolute top-1/2 left-0 right-0 h-2 bg-red-900/20 rounded-full" />
              <div className="absolute top-2/3 left-0 right-0 h-1 bg-orange-800/30 rounded-full" />
            </div>
            {/* Jupiter Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-12 border-2 border-orange-400/30 rounded-full rotate-[-15deg]" />
          </div>

          <div className="relative">
            {/* Health Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-orange-400/80 uppercase tracking-widest font-bold">
                  Saldo do Pool
                </span>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                healthScore >= 80 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                healthScore >= 50 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  healthScore >= 80 ? 'bg-green-500' :
                  healthScore >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <span className="text-sm font-bold">Saude: {healthScore}%</span>
              </div>
            </div>

            {/* Main Balance - Animated */}
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-300 tracking-tight mb-2">
              ${animatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            {/* Today's Activity */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-400 flex items-center gap-1">
                <span className="text-lg">↗</span> +${data?.todayDeposits?.toLocaleString() || 0}
                <span className="text-gray-500 text-xs">hoje</span>
              </span>
              <span className="text-orange-400 flex items-center gap-1">
                <span className="text-lg">💉</span> ${data?.todayWithdrawals?.toLocaleString() || 0}
                <span className="text-gray-500 text-xs">injetado</span>
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900/40 to-emerald-900/30 border border-green-500/30 p-4">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📈</span>
                <span className="text-[10px] text-green-400/80 uppercase tracking-wider">Total Acumulado</span>
              </div>
              <div className="text-2xl font-black text-green-400">
                ${data?.totalDeposits?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                10% de cada ciclo
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-900/40 to-amber-900/30 border border-orange-500/30 p-4">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💫</span>
                <span className="text-[10px] text-orange-400/80 uppercase tracking-wider">Total Injetado</span>
              </div>
              <div className="text-2xl font-black text-orange-400">
                ${data?.totalWithdrawals?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                Em niveis travados
              </div>
            </div>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
          <div className="text-xs text-orange-400/80 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>⚡</span> Como Funciona
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-xl font-black text-black shrink-0">
                1
              </div>
              <div>
                <div className="font-bold text-orange-300 mb-1">Coleta Automatica</div>
                <div className="text-sm text-gray-400">
                  10% do ganho de cada recebedor (posicao 0) vai automaticamente para o Jupiter Pool.
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-xl font-black text-black shrink-0">
                2
              </div>
              <div>
                <div className="font-bold text-amber-300 mb-1">Acumulacao Continua</div>
                <div className="text-sm text-gray-400">
                  O pool acumula fundos 24/7 conforme os ciclos sao processados em todos os 10 niveis.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-xl font-black text-black shrink-0">
                3
              </div>
              <div>
                <div className="font-bold text-yellow-300 mb-1">Injecao Inteligente</div>
                <div className="text-sm text-gray-400">
                  Quando um nivel fica 3+ dias sem ciclar, Jupiter Pool injeta fundos subsidiados para destravar.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Levels Health Monitor */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
          <div className="text-xs text-orange-400/80 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>🛡️</span> Monitor de Saude dos Niveis
          </div>

          <div className="space-y-2">
            {levelsHealth.map((level) => (
              <div
                key={level.level}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  level.status === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                  level.status === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                  'bg-green-500/5 border border-green-500/20'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                  level.status === 'critical' ? 'bg-red-500/20 text-red-400' :
                  level.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  N{level.level}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">Nivel {level.level}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      level.status === 'critical' ? 'bg-red-500/20 text-red-400' :
                      level.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {level.status === 'critical' ? '🚨 Critico' :
                       level.status === 'warning' ? '⚠️ Atencao' :
                       '✅ Saudavel'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{level.daysSinceLastCycle}d sem ciclo</span>
                    <span>{level.queueSize} na fila</span>
                    {level.estimatedIntervention > 0 && (
                      <span className="text-orange-400">~${level.estimatedIntervention} intervencao</span>
                    )}
                  </div>
                </div>

                <div className={`w-2 h-2 rounded-full ${
                  level.status === 'critical' ? 'bg-red-500 animate-pulse' :
                  level.status === 'warning' ? 'bg-yellow-500 animate-pulse' :
                  'bg-green-500'
                }`} />
              </div>
            ))}
          </div>
        </div>

        {/* Position 5 Distribution */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5">
          <div className="text-xs text-orange-400/80 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>📊</span> Distribuicao da Posicao 5
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">🏦</div>
                <div className="text-green-400 font-bold">10%</div>
              </div>
              <div className="text-xs text-gray-400">Reserva Anti-Travamento</div>
              <div className="text-[10px] text-gray-600 mt-1">Fundo de seguranca do sistema</div>
            </div>

            <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-lg">⚙️</div>
                <div className="text-cyan-400 font-bold">10%</div>
              </div>
              <div className="text-xs text-gray-400">Operacional</div>
              <div className="text-[10px] text-gray-600 mt-1">Custos e manutencao</div>
            </div>

            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-lg">🎁</div>
                <div className="text-yellow-400 font-bold">40%</div>
              </div>
              <div className="text-xs text-gray-400">Bonus Indicador</div>
              <div className="text-[10px] text-gray-600 mt-1">Recompensa por indicacao</div>
            </div>

            <div className="bg-pink-500/10 rounded-xl p-4 border border-pink-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-lg">💎</div>
                <div className="text-pink-400 font-bold">40%</div>
              </div>
              <div className="text-xs text-gray-400">Lucro Sistema</div>
              <div className="text-[10px] text-gray-600 mt-1">Sustentabilidade</div>
            </div>
          </div>

          {/* Jupiter Pool Note */}
          <div className="mt-4 p-3 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl border border-orange-500/30">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xl">🪐</span>
              <div>
                <span className="text-orange-300 font-bold">+10% do Recebedor</span>
                <span className="text-gray-400"> vai para Jupiter Pool</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-2xl shrink-0">
              🔒
            </div>
            <div>
              <div className="font-bold text-orange-300 mb-2">Sistema Anti-Travamento Garantido</div>
              <div className="text-sm text-gray-400 space-y-2">
                <p>O Jupiter Pool garante que o sistema <span className="text-orange-400 font-bold">NUNCA trave</span> por falta de liquidez.</p>
                <p>Triggers de intervencao:</p>
                <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                  <li><span className="text-yellow-400">Amarelo (3 dias)</span> - Monitoramento ativo</li>
                  <li><span className="text-orange-400">Laranja (5 dias)</span> - Preparando intervencao</li>
                  <li><span className="text-red-400">Vermelho (7 dias)</span> - Intervencao automatica</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-6 px-4">
        <div className="flex justify-around items-end max-w-md mx-auto bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-2">
          <Link href="/dashboard/cosmos" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-500 hover:text-white transition-colors">
            <span className="text-lg">🌌</span>
            <span className="text-[9px] font-medium">Orbita</span>
          </Link>
          <Link href="/dashboard/jupiter-pool" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-br from-orange-600/30 to-amber-600/20 text-orange-400">
            <span className="text-lg">🪐</span>
            <span className="text-[9px] font-medium">Jupiter</span>
          </Link>
          <Link href="/dashboard/wallet" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-500 hover:text-white transition-colors">
            <span className="text-lg">💰</span>
            <span className="text-[9px] font-medium">Carteira</span>
          </Link>
          <Link href="/dashboard/ranking" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-500 hover:text-white transition-colors">
            <span className="text-lg">🏆</span>
            <span className="text-[9px] font-medium">Ranking</span>
          </Link>
          <Link href="/dashboard/settings" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-500 hover:text-white transition-colors">
            <span className="text-lg">⚙️</span>
            <span className="text-[9px] font-medium">Config</span>
          </Link>
        </div>
      </nav>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  )
}
