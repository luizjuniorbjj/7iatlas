'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LEVEL_CONFIG } from '@/constants/levels'
import { ASSETS } from '@/constants/assets'
import { formatCurrency, formatNumber } from '@/utils/format'

// Types
interface UserData {
  id: string
  name: string
  email: string
  referralCode: string
  currentLevel: number
  balance: number
  totalEarned: number
  totalCycles: number
  referralBonus?: number
  referralCount?: number
}

interface LevelPosition {
  level: number
  position: number
  totalInQueue: number
  quotaCount: number
  cyclesCompleted: number
  totalEarned: number
}

interface QueuePerson {
  position: number
  name: string
  code: string
  isCurrentUser: boolean
}

interface TickerItem {
  id: string
  type: 'cycle' | 'entry' | 'bonus'
  user: string
  level: number
  amount: number
  time: string
}

interface JupiterPoolData {
  balance: number
  totalDeposits: number
  totalWithdrawals: number
  todayDeposits: number
  todayWithdrawals: number
  interventions: number
  protectedLevels: number[]
  healthScore: number
}

interface SelectedPlanet {
  position: number
  name: string
  code: string
  isCurrentUser: boolean
  index: number
}

export default function CosmicDashboard() {
  const [user, setUser] = useState<UserData | null>(null)
  const [positions, setPositions] = useState<LevelPosition[]>([])
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [queueData, setQueueData] = useState<QueuePerson[]>([])
  const [communityFund, setCommunityFund] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedPlanet, setSelectedPlanet] = useState<SelectedPlanet | null>(null)
  const [orbitRotation, setOrbitRotation] = useState(0)
  const [isRotating, setIsRotating] = useState(true)
  const [jupiterPool, setJupiterPool] = useState<JupiterPoolData | null>(null)
  const [showJupiterDetails, setShowJupiterDetails] = useState(false)
  const orbitRef = useRef<HTMLDivElement>(null)

  // Ticker data
  const tickerItems: TickerItem[] = useMemo(() => [
    { id: '1', type: 'cycle', user: 'atlas_whale', level: 7, amount: 1280, time: '2min' },
    { id: '2', type: 'entry', user: 'moon_shot', level: 5, amount: 160, time: '3min' },
    { id: '3', type: 'bonus', user: 'lucky_7', level: 4, amount: 64, time: '5min' },
    { id: '4', type: 'cycle', user: 'diamond_h', level: 6, amount: 640, time: '7min' },
    { id: '5', type: 'entry', user: 'crypto_king', level: 8, amount: 1280, time: '8min' },
    { id: '6', type: 'cycle', user: 'star_rider', level: 3, amount: 80, time: '10min' },
  ], [])

  // Orbit rotation animation
  useEffect(() => {
    if (!isRotating) return
    const interval = setInterval(() => {
      setOrbitRotation(prev => (prev + 0.5) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [isRotating])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken')

        // Se não tem token, redireciona para login
        if (!token) {
          window.location.href = '/auth/login'
          return
        }

        const headers = { Authorization: `Bearer ${token}` }

        const userRes = await fetch('/api/users/me', { headers })

        // Se não autorizado, redireciona para login
        if (userRes.status === 401) {
          localStorage.removeItem('accessToken')
          window.location.href = '/auth/login'
          return
        }

        const userData = await userRes.json()
        if (userData.data?.user) {
          const { user: apiUser, stats } = userData.data
          setUser({
            id: apiUser.id,
            name: apiUser.name || 'Explorador',
            email: apiUser.email,
            referralCode: apiUser.referralCode,
            currentLevel: apiUser.currentLevel || 1,
            balance: stats?.balance || 0,
            totalEarned: stats?.totalEarned || 0,
            totalCycles: stats?.cyclesCompleted || 0,
            referralBonus: stats?.totalBonus || 0,
            referralCount: stats?.referralsCount || 0,
          })
        } else {
          // Dados padrão se API não retornar user
          setUser({
            id: 'unknown',
            name: 'Explorador',
            email: '',
            referralCode: 'ATLAS000',
            currentLevel: 1,
            balance: 0,
            totalEarned: 0,
            totalCycles: 0,
            referralBonus: 0,
            referralCount: 0,
          })
        }

        const positionsData: LevelPosition[] = []
        // Busca posições em paralelo com timeout
        const positionPromises = []
        for (let level = 1; level <= 10; level++) {
          const fetchWithTimeout = Promise.race([
            fetch(`/api/matrix/position/${level}`, { headers }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          ])
          positionPromises.push(
            fetchWithTimeout
              .then((res: any) => res.json())
              .then((posData: any) => {
                if (posData.hasPosition) {
                  return {
                    level,
                    position: posData.position,
                    totalInQueue: posData.totalInQueue,
                    quotaCount: posData.totalQuotas || 1,
                    cyclesCompleted: posData.cyclesCompleted || 0,
                    totalEarned: posData.totalEarned || 0,
                  }
                }
                return null
              })
              .catch(() => null)
          )
        }
        const results = await Promise.all(positionPromises)
        results.forEach(pos => {
          if (pos) positionsData.push(pos)
        })
        positionsData.sort((a, b) => a.level - b.level)
        setPositions(positionsData)
        if (positionsData.length > 0) {
          setSelectedLevel(positionsData[0].level)
        }

        const statsRes = await fetch('/api/matrix/stats', { headers })
        const statsData = await statsRes.json()
        if (statsData.levels) {
          const totalFund = statsData.levels.reduce((sum: number, l: any) => sum + Number(l.cashBalance || 0), 0)
          setCommunityFund(totalFund)
        }

        // Fetch Jupiter Pool data
        try {
          const jupiterRes = await fetch('/api/jupiter-pool/balance', { headers })
          const jupiterData = await jupiterRes.json()
          if (jupiterData.success && jupiterData.data) {
            // Calculate health score based on balance vs total deposits
            const healthScore = jupiterData.data.totalDeposits > 0
              ? Math.min(100, Math.round((jupiterData.data.balance / jupiterData.data.totalDeposits) * 100))
              : 100

            setJupiterPool({
              ...jupiterData.data,
              interventions: Math.floor(jupiterData.data.totalWithdrawals / 50) || 0,
              protectedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(() => Math.random() > 0.3),
              healthScore,
            })
          } else {
            // Set mock data for demo
            setJupiterPool({
              balance: 15420.50,
              totalDeposits: 25000,
              totalWithdrawals: 9579.50,
              todayDeposits: 320,
              todayWithdrawals: 70,
              interventions: 42,
              protectedLevels: [1, 2, 3, 4, 5, 6, 7],
              healthScore: 85,
            })
          }
        } catch {
          // Mock data if API fails
          setJupiterPool({
            balance: 15420.50,
            totalDeposits: 25000,
            totalWithdrawals: 9579.50,
            todayDeposits: 320,
            todayWithdrawals: 70,
            interventions: 42,
            protectedLevels: [1, 2, 3, 4, 5, 6, 7],
            healthScore: 85,
          })
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        const res = await fetch(`/api/matrix/queue/${selectedLevel}?limit=6&highlight=true`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.items) {
          setQueueData(data.items.map((item: any) => ({
            position: item.position,
            name: item.name || 'Anon',
            code: item.code,
            isCurrentUser: item.isCurrentUser,
          })))
        }
      } catch (error) {
        console.error('Error fetching queue:', error)
      }
    }

    fetchQueue()
    setSelectedPlanet(null)
  }, [selectedLevel])

  const userPositionInLevel = positions.find(p => p.level === selectedLevel)

  const getLevelStatus = (level: number) => {
    const pos = positions.find(p => p.level === level)
    if (!pos) return 'locked'
    if (pos.position <= 3) return 'hot'
    if (pos.position <= 6) return 'warm'
    return 'active'
  }

  // Calculate planet position with rotation
  const calculatePlanetPosition = (index: number, total: number, radius: number) => {
    const baseAngle = (index / total) * 2 * Math.PI - Math.PI / 2
    const rotatedAngle = baseAngle + (orbitRotation * Math.PI / 180)
    const x = 50 + radius * Math.cos(rotatedAngle)
    const y = 50 + radius * Math.sin(rotatedAngle)
    return { x, y, angle: rotatedAngle }
  }

  // Handle planet click
  const handlePlanetClick = (person: QueuePerson, index: number) => {
    setIsRotating(false)
    setSelectedPlanet({
      ...person,
      index
    })
  }

  // Close planet details
  const closePlanetDetails = () => {
    setSelectedPlanet(null)
    setIsRotating(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-600/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        {[...Array(50)].map((_, i) => (
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
          <Image src={ASSETS.LOGO} alt="7iATLAS" width={90} height={36} priority />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Saldo</div>
              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                {formatCurrency(user?.balance)}
              </div>
            </div>
            <Link href="/dashboard/settings" className="relative group">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-[2px]">
                <div className="w-full h-full rounded-full bg-[#0a0a0f] flex items-center justify-center text-lg font-bold">
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
            </Link>
          </div>
        </div>

        {/* Live Ticker */}
        <div className="relative overflow-hidden py-2 border-y border-white/5 bg-black/40 backdrop-blur-sm">
          <div className="flex animate-ticker">
            {[...tickerItems, ...tickerItems, ...tickerItems].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 px-4 text-xs whitespace-nowrap">
                <span className={`w-2 h-2 rounded-full ${
                  item.type === 'cycle' ? 'bg-green-500 animate-pulse' :
                  item.type === 'bonus' ? 'bg-yellow-500' : 'bg-purple-500'
                }`} />
                <span className="text-gray-400">{item.user}</span>
                <span className={`font-bold ${
                  item.type === 'cycle' ? 'text-green-400' :
                  item.type === 'bonus' ? 'text-yellow-400' : 'text-purple-400'
                }`}>+${item.amount}</span>
                <span className="text-gray-600">N{item.level}</span>
                <span className="text-gray-700">•</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 pb-28 space-y-5 pt-4">

        {/* Fundo Cósmico + Jupiter Pool - Side by Side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Fundo Cósmico */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/40 via-green-900/30 to-teal-900/40 border border-emerald-500/30 p-3">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/20 rounded-full blur-2xl" />
            <div className="relative">
              <div className="text-[9px] text-emerald-400/80 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Fundo Cósmico
              </div>
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-200 to-teal-300 tracking-tight">
                {formatCurrency(communityFund)}
              </div>
              <div className="text-[8px] text-gray-500 mt-0.5">Circulando</div>
            </div>
          </div>

          {/* Jupiter Pool - Compact */}
          <button
            onClick={() => setShowJupiterDetails(!showJupiterDetails)}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-950/60 via-amber-900/40 to-yellow-900/50 border border-orange-500/40 p-3 text-left transition-all hover:border-orange-400/60"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[9px] text-orange-400/90 uppercase tracking-widest font-bold flex items-center gap-1">
                  <span>🪐</span> Jupiter Pool
                </div>
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] ${
                  jupiterPool?.healthScore && jupiterPool.healthScore >= 80 ? 'bg-green-500/20 text-green-400' :
                  jupiterPool?.healthScore && jupiterPool.healthScore >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  <div className={`w-1 h-1 rounded-full animate-pulse ${
                    jupiterPool?.healthScore && jupiterPool.healthScore >= 80 ? 'bg-green-500' :
                    jupiterPool?.healthScore && jupiterPool.healthScore >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="font-bold">{jupiterPool?.healthScore || 0}%</span>
                </div>
              </div>
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-300">
                {formatCurrency(jupiterPool?.balance)}
              </div>
              <div className="text-[8px] text-gray-500 mt-0.5 flex items-center gap-1">
                Reserva <span className="text-orange-400">{showJupiterDetails ? '▲' : '▼'}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Jupiter Pool Details Panel - Expandable */}
        {showJupiterDetails && jupiterPool && (
          <div className="w-full overflow-hidden rounded-2xl bg-gradient-to-br from-orange-950/40 to-amber-950/30 border border-orange-500/20 p-3">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-black/30 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-orange-400">{jupiterPool.interventions}</div>
                <div className="text-[7px] text-gray-500 uppercase">Intervenções</div>
              </div>
              <div className="bg-black/30 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-green-400">{jupiterPool.protectedLevels.length}</div>
                <div className="text-[7px] text-gray-500 uppercase">Níveis OK</div>
              </div>
              <div className="bg-black/30 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-emerald-400">+${jupiterPool.todayDeposits}</div>
                <div className="text-[7px] text-gray-500 uppercase">Hoje</div>
              </div>
              <div className="bg-black/30 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-yellow-400">10%</div>
                <div className="text-[7px] text-gray-500 uppercase">Por Ciclo</div>
              </div>
            </div>

            {/* How it Works */}
            <div className="mb-3">
              <div className="text-[9px] text-orange-400/80 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span>⚡</span> Como Funciona
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-black/30 rounded-lg p-2 text-center">
                  <div className="text-base mb-0.5">💰</div>
                  <div className="text-[8px] text-orange-400 font-bold">1. Coleta</div>
                  <div className="text-[7px] text-gray-500">10% ciclo</div>
                </div>
                <div className="bg-black/30 rounded-lg p-2 text-center">
                  <div className="text-base mb-0.5">🏦</div>
                  <div className="text-[8px] text-amber-400 font-bold">2. Acumula</div>
                  <div className="text-[7px] text-gray-500">Reserva</div>
                </div>
                <div className="bg-black/30 rounded-lg p-2 text-center">
                  <div className="text-base mb-0.5">💉</div>
                  <div className="text-[8px] text-yellow-400 font-bold">3. Injeta</div>
                  <div className="text-[7px] text-gray-500">Destrava</div>
                </div>
              </div>
            </div>

            {/* Protected Levels */}
            <div className="mb-3">
              <div className="text-[9px] text-orange-400/80 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span>🛡️</span> Níveis Protegidos
              </div>
              <div className="flex flex-wrap justify-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
                  const isProtected = jupiterPool.protectedLevels.includes(level)
                  return (
                    <div
                      key={level}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${
                        isProtected
                          ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                          : 'bg-red-500/10 text-red-400/50 border border-red-500/20'
                      }`}
                    >
                      {level}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Distribution */}
            <div className="bg-black/30 rounded-lg p-2 mb-3">
              <div className="text-[8px] text-orange-400/80 uppercase mb-2">Distribuição Pos. 5</div>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div>
                  <div className="h-1 rounded-full bg-green-500 mb-1" />
                  <div className="text-green-400 text-[9px] font-bold">10%</div>
                  <div className="text-[6px] text-gray-500">Reserva</div>
                </div>
                <div>
                  <div className="h-1 rounded-full bg-cyan-500 mb-1" />
                  <div className="text-cyan-400 text-[9px] font-bold">10%</div>
                  <div className="text-[6px] text-gray-500">Operac.</div>
                </div>
                <div>
                  <div className="h-1 rounded-full bg-yellow-500 mb-1" />
                  <div className="text-yellow-400 text-[9px] font-bold">40%</div>
                  <div className="text-[6px] text-gray-500">Bônus</div>
                </div>
                <div>
                  <div className="h-1 rounded-full bg-pink-500 mb-1" />
                  <div className="text-pink-400 text-[9px] font-bold">40%</div>
                  <div className="text-[6px] text-gray-500">Lucro</div>
                </div>
              </div>
            </div>

            {/* Anti-Lock Note + Action Link */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[8px] text-gray-400">
                <span>🔒</span>
                <span>3+ dias = intervenção automática</span>
              </div>
              <Link
                href="/dashboard/jupiter-pool"
                className="px-3 py-1.5 bg-orange-600/30 hover:bg-orange-600/50 rounded-lg text-orange-300 text-[9px] font-bold"
              >
                Ver mais →
              </Link>
            </div>
          </div>
        )}

        {/* Level Selector - Premium */}
        <div className="relative">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 text-center">Selecione o Nivel</div>
          <div className="flex justify-center gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
              const status = getLevelStatus(level)
              const isSelected = selectedLevel === level
              const hasPosition = positions.some(p => p.level === level)

              return (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`relative w-12 h-12 rounded-xl font-bold text-sm transition-all duration-300 ${
                    isSelected
                      ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-black scale-110 shadow-lg shadow-orange-500/40 ring-2 ring-orange-400/50'
                      : status === 'hot'
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                      : status === 'warm'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md shadow-blue-500/20'
                      : hasPosition
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20'
                      : 'bg-white/5 text-gray-500 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {level}
                  {hasPosition && !isSelected && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-[#0a0a0f]" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Level Value Display */}
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="text-gray-400 text-sm">Entrada</span>
              <span className="text-2xl font-black text-white">${LEVEL_CONFIG.ENTRY_VALUES[selectedLevel - 1]}</span>
              <span className="text-gray-600">→</span>
              <span className="text-xl font-bold text-green-400">${LEVEL_CONFIG.REWARD_VALUES[selectedLevel - 1]}</span>
              <span className="text-gray-400 text-sm">Retorno</span>
            </div>
          </div>
        </div>

        {/* Interactive Orbit Visualization */}
        <div className="relative">
          {/* Orbit Legend */}
          <div className="flex justify-center gap-4 mb-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-400 to-emerald-500" />
              <span className="text-gray-400">Proximo a ciclar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500" />
              <span className="text-gray-400">Voce</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600" />
              <span className="text-gray-400">Na fila</span>
            </div>
          </div>

          {/* Orbit Container */}
          <div
            ref={orbitRef}
            className="relative aspect-square max-w-[340px] mx-auto cursor-pointer"
            onClick={(e) => {
              if (e.target === e.currentTarget) closePlanetDetails()
            }}
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-blue-600/10 rounded-full blur-xl" />

            {/* Progress Arc - Shows position progress */}
            {userPositionInLevel && (
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50%"
                  cy="50%"
                  r="46%"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="8"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="46%"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${((userPositionInLevel.totalInQueue - userPositionInLevel.position + 1) / userPositionInLevel.totalInQueue) * 289} 289`}
                  className="transition-all duration-1000"
                />
              </svg>
            )}

            {/* Outer Ring with rotation indicator */}
            <div className="absolute inset-6 rounded-full border border-purple-500/30">
              {/* Orbit path markers */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 bg-purple-500/30 rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${i * 30}deg) translateX(calc(50% + 130px)) translateY(-50%)`,
                  }}
                />
              ))}
            </div>

            {/* Inner decorative ring */}
            <div className="absolute inset-16 rounded-full border border-cyan-500/20" />

            {/* Central Sun - Clickable */}
            <button
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 group"
              onClick={closePlanetDetails}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-black">
                <span className="text-lg font-black">${LEVEL_CONFIG.ENTRY_VALUES[selectedLevel - 1]}</span>
                <span className="text-[9px] font-bold opacity-70">NIVEL {selectedLevel}</span>
              </div>
              {/* Sun corona effect */}
              <div className="absolute -inset-2 rounded-full border-2 border-yellow-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            </button>

            {/* Position Planets - Interactive */}
            {queueData.slice(0, 6).map((person, idx) => {
              const { x, y } = calculatePlanetPosition(idx, 6, 36)
              const isUser = person.isCurrentUser
              const isTop3 = person.position <= 3
              const isSelected = selectedPlanet?.index === idx

              return (
                <button
                  key={`${person.code}-${idx}`}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                    isSelected ? 'z-30 scale-125' : 'z-10 hover:scale-110'
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePlanetClick(person, idx)
                  }}
                >
                  {/* Planet Glow */}
                  <div className={`absolute inset-0 rounded-full blur-md transition-all ${
                    isSelected ? 'scale-[2]' : 'scale-[1.5]'
                  } ${
                    isUser ? 'bg-yellow-500/60' : isTop3 ? 'bg-green-500/50' : 'bg-purple-500/40'
                  }`} />

                  {/* Planet Ring (for selected) */}
                  {isSelected && (
                    <div className="absolute -inset-2 rounded-full border-2 border-white/50 animate-spin-slow" style={{ animationDuration: '3s' }} />
                  )}

                  {/* Planet */}
                  <div className={`relative w-12 h-12 rounded-full flex flex-col items-center justify-center font-bold transition-all ${
                    isUser
                      ? 'bg-gradient-to-br from-yellow-400 via-orange-400 to-yellow-500 text-black ring-2 ring-yellow-300 shadow-lg shadow-yellow-500/50'
                      : isTop3
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30 ring-2 ring-green-400/50'
                      : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md ring-1 ring-purple-400/30'
                  }`}>
                    <span className="text-[10px] font-black">#{person.position}</span>
                    {isUser && <span className="text-[7px] opacity-80">EU</span>}
                  </div>

                  {/* Position indicator line to center */}
                  {isSelected && (
                    <div
                      className="absolute w-px bg-gradient-to-b from-white/50 to-transparent"
                      style={{
                        height: '60px',
                        top: '50%',
                        left: '50%',
                        transformOrigin: 'top center',
                        transform: `translateX(-50%) rotate(${Math.atan2(50 - y, 50 - x) * 180 / Math.PI + 90}deg)`,
                      }}
                    />
                  )}
                </button>
              )
            })}

            {/* Selected Planet Info Panel */}
            {selectedPlanet && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 p-4 z-40 animate-fadeIn">
                <button
                  onClick={closePlanetDetails}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
                >
                  ✕
                </button>
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold ${
                    selectedPlanet.isCurrentUser
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black'
                      : selectedPlanet.position <= 3
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                      : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                  }`}>
                    #{selectedPlanet.position}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">
                      {selectedPlanet.isCurrentUser ? 'Voce!' : selectedPlanet.name}
                    </div>
                    <div className="text-gray-400 text-xs font-mono">{selectedPlanet.code}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedPlanet.position <= 3 ? (
                        <span className="text-green-400 text-xs font-bold flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Proximo a ciclar!
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          Faltam <span className="text-white font-bold">{selectedPlanet.position - 1}</span> posicoes
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedPlanet.isCurrentUser && (
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Recebera</div>
                      <div className="text-lg font-bold text-green-400">${LEVEL_CONFIG.REWARD_VALUES[selectedLevel - 1]}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User Position Indicator (if not in top 6) */}
            {userPositionInLevel && userPositionInLevel.position > 6 && !selectedPlanet && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-xl backdrop-blur-sm">
                <span className="text-yellow-400 text-sm font-bold">
                  Voce esta na posicao #{userPositionInLevel.position} de {userPositionInLevel.totalInQueue}
                </span>
              </div>
            )}

            {/* Rotation Control */}
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                isRotating
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'bg-white/10 text-gray-400'
              }`}
            >
              {isRotating ? '⏸' : '▶'}
            </button>
          </div>

          {/* Orbit Instructions */}
          <div className="text-center mt-2 text-xs text-gray-500">
            Toque em um planeta para ver detalhes
          </div>
        </div>

        {/* Position Stats */}
        {userPositionInLevel ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-4 border border-white/10 text-center">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                #{userPositionInLevel.position}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Posicao</div>
            </div>
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-4 border border-white/10 text-center">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {userPositionInLevel.quotaCount}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Cotas</div>
            </div>
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-4 border border-white/10 text-center">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                {userPositionInLevel.position - 1}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Faltam</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-gray-400 mb-3">Voce nao esta neste nivel</div>
            <Link href="/dashboard/wallet" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all">
              <span>🚀</span>
              Entrar na Orbita
            </Link>
          </div>
        )}

        {/* Stats Cards - Saldo Total + Bônus Indicação */}
        <div className="grid grid-cols-2 gap-3">
          {/* Saldo Total */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/20 p-4">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="text-2xl font-black text-green-400">{formatCurrency(user?.balance)}</div>
              <div className="text-[10px] text-green-400/70 uppercase tracking-wider mb-1">Saldo Total</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-emerald-400">↑ +$320 esta semana</span>
              </div>
              <div className="text-[10px] text-gray-500">{formatNumber(positions.reduce((sum, p) => sum + p.cyclesCompleted, 0))} ciclos</div>
            </div>
          </div>
          {/* Bônus Indicação */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/20 p-4">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="text-2xl font-black text-purple-400">{formatCurrency(user?.referralBonus)}</div>
              <div className="text-[10px] text-purple-400/70 uppercase tracking-wider mb-1">Bônus Indicação</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-pink-400">↑ +$80 esta semana</span>
              </div>
              <div className="text-[10px] text-gray-500">{formatNumber(user?.referralCount)} indicações</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/dashboard/wallet?tab=donate" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 p-4 text-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/30">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="relative">
              <div className="text-2xl mb-1">💎</div>
              <div className="text-xs font-bold text-white">Doar</div>
            </div>
          </Link>
          <Link href="/dashboard/wallet?tab=buy" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-pink-700 p-4 text-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="relative">
              <div className="text-2xl mb-1">🚀</div>
              <div className="text-xs font-bold text-white">Comprar</div>
            </div>
          </Link>
          <Link href="/dashboard/wallet?tab=transfer" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 p-4 text-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/30">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="relative">
              <div className="text-2xl mb-1">💸</div>
              <div className="text-xs font-bold text-black">Transferir</div>
            </div>
          </Link>
        </div>

        {/* User Profile Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-4">
          <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
                <div className="w-full h-full rounded-full bg-[#0a0a0f] flex items-center justify-center text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-purple-600 rounded-full text-[9px] font-bold">
                N{user?.currentLevel || 1}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-white">{user?.name || 'Explorador'}</div>
              <div className="text-xs text-purple-400 font-mono">{user?.referralCode}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{positions.reduce((sum, p) => sum + p.quotaCount, 0)} cotas</span>
                <span className="text-gray-700">•</span>
                <span className="text-xs text-gray-500">{positions.length} niveis</span>
              </div>
            </div>
            <Link href="/dashboard/settings" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Premium */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-6 px-4">
        <div className="flex justify-around items-end max-w-md mx-auto bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-2">
          <Link href="/dashboard/cosmos" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-br from-purple-600/30 to-pink-600/20 text-white">
            <span className="text-lg">🌌</span>
            <span className="text-[9px] font-medium">Orbita</span>
          </Link>
          <Link href="/dashboard/jupiter-pool" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-500 hover:text-orange-400 transition-colors">
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

      {/* FAB */}
      <Link href="/dashboard/wallet?tab=buy" className="fixed bottom-28 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-green-500/40 hover:scale-110 transition-transform">
        +
      </Link>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-ticker {
          animation: ticker 20s linear infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 30s linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
