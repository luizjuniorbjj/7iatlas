'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ASSETS } from '@/constants/assets'

interface RankingUser {
  rank: number
  userId: string
  name: string
  code: string
  totalReceived: number
  totalBonus: number
  totalQuotas: number
  currentLevel: number
  isCurrentUser: boolean
}

interface UserStats {
  rank: number
  totalReceived: number
  totalBonus: number
  totalQuotas: number
  currentLevel: number
  name: string
  code: string
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingUser[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'received' | 'cycles' | 'level'>('received')

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        const headers = { Authorization: `Bearer ${token}` }

        // Fetch ranking data
        const rankRes = await fetch(`/api/ranking?sort=${filter}`, { headers })
        const rankData = await rankRes.json()

        if (rankData.ranking) {
          setRanking(rankData.ranking)
        }

        if (rankData.currentUser) {
          setUserStats(rankData.currentUser)
        }
      } catch (error) {
        console.error('Error fetching ranking:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRanking()
  }, [filter])

  // Get medal/badge for position
  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: '🥇', class: 'top-1', title: 'Comandante Supremo' }
    if (rank === 2) return { icon: '🥈', class: 'top-2', title: 'Almirante Estelar' }
    if (rank === 3) return { icon: '🥉', class: 'top-3', title: 'Capitao Cosmico' }
    if (rank <= 10) return { icon: '⭐', class: 'top-10', title: 'Elite Explorer' }
    if (rank <= 50) return { icon: '🚀', class: 'top-50', title: 'Space Voyager' }
    return { icon: '🌍', class: '', title: 'Explorer' }
  }

  // Generate cosmic avatar
  const getCosmicAvatar = (name: string, rank: number) => {
    const colors = [
      'from-yellow-400 to-orange-500', // 1st
      'from-gray-300 to-gray-400', // 2nd
      'from-amber-600 to-amber-700', // 3rd
      'from-purple-500 to-pink-500', // top 10
      'from-blue-500 to-cyan-500', // top 50
      'from-indigo-500 to-purple-500', // others
    ]

    let colorIndex = 5
    if (rank === 1) colorIndex = 0
    else if (rank === 2) colorIndex = 1
    else if (rank === 3) colorIndex = 2
    else if (rank <= 10) colorIndex = 3
    else if (rank <= 50) colorIndex = 4

    return colors[colorIndex]
  }

  if (loading) {
    return (
      <div className="cosmic-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
          <p className="text-gray-400 animate-pulse">Carregando ranking cosmico...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cosmic-bg pb-24 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/5">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard/cosmos" className="flex items-center gap-2">
              <Image src={ASSETS.LOGO} alt={ASSETS.APP_NAME} width={100} height={40} priority />
            </Link>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
              Ranking Cosmico
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* User Position Card */}
        {userStats && (
          <div className="cosmic-card p-4 border-2 border-yellow-500/30">
            <div className="text-xs text-yellow-400/70 uppercase tracking-wider mb-2">Sua Posicao</div>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getCosmicAvatar(userStats.name, userStats.rank)} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}>
                #{userStats.rank}
              </div>
              <div className="flex-1">
                <div className="font-bold text-white text-lg">{userStats.name}</div>
                <div className="text-xs text-purple-400 font-mono">{userStats.code}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-yellow-400 text-sm">{getRankBadge(userStats.rank).icon}</span>
                  <span className="text-xs text-gray-400">{getRankBadge(userStats.rank).title}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">
                  ${userStats.totalReceived.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{userStats.totalQuotas} cotas</div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('received')}
            className={`cosmic-btn ${filter === 'received' ? 'cosmic-btn-primary' : ''} whitespace-nowrap`}
          >
            💰 Recebimento
          </button>
          <button
            onClick={() => setFilter('cycles')}
            className={`cosmic-btn ${filter === 'cycles' ? 'cosmic-btn-primary' : ''} whitespace-nowrap`}
          >
            🔄 Ciclos
          </button>
          <button
            onClick={() => setFilter('level')}
            className={`cosmic-btn ${filter === 'level' ? 'cosmic-btn-primary' : ''} whitespace-nowrap`}
          >
            🚀 Nivel
          </button>
        </div>

        {/* Top 3 Podium */}
        <div className="cosmic-card p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-4 text-center">Podio Estelar</div>
          <div className="flex items-end justify-center gap-2">
            {/* 2nd Place */}
            {ranking[1] && (
              <div className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${getCosmicAvatar(ranking[1].name, 2)} flex items-center justify-center text-lg font-bold text-white shadow-lg mb-2`}>
                  {ranking[1].name.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs text-white font-medium truncate max-w-[80px]">{ranking[1].name}</div>
                <div className="text-xs text-green-400">${ranking[1].totalReceived.toLocaleString()}</div>
                <div className="w-16 h-20 bg-gradient-to-t from-gray-400/30 to-gray-400/10 rounded-t-lg mt-2 flex items-end justify-center pb-2">
                  <span className="text-2xl">🥈</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {ranking[0] && (
              <div className="flex flex-col items-center -mt-4">
                <div className="relative">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${getCosmicAvatar(ranking[0].name, 1)} flex items-center justify-center text-2xl font-bold text-white shadow-lg mb-2 ring-4 ring-yellow-400/50`}>
                    {ranking[0].name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">👑</div>
                </div>
                <div className="text-sm text-white font-bold truncate max-w-[100px]">{ranking[0].name}</div>
                <div className="text-sm text-green-400 font-bold">${ranking[0].totalReceived.toLocaleString()}</div>
                <div className="w-20 h-28 bg-gradient-to-t from-yellow-500/30 to-yellow-500/10 rounded-t-lg mt-2 flex items-end justify-center pb-2">
                  <span className="text-3xl">🥇</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {ranking[2] && (
              <div className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${getCosmicAvatar(ranking[2].name, 3)} flex items-center justify-center text-lg font-bold text-white shadow-lg mb-2`}>
                  {ranking[2].name.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs text-white font-medium truncate max-w-[80px]">{ranking[2].name}</div>
                <div className="text-xs text-green-400">${ranking[2].totalReceived.toLocaleString()}</div>
                <div className="w-16 h-16 bg-gradient-to-t from-amber-600/30 to-amber-600/10 rounded-t-lg mt-2 flex items-end justify-center pb-2">
                  <span className="text-2xl">🥉</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Ranking List */}
        <div className="cosmic-card p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-4">Exploradores Ativos</div>
          <div className="space-y-2">
            {ranking.map((user, idx) => {
              const badge = getRankBadge(user.rank)
              const isTop3 = user.rank <= 3

              return (
                <div
                  key={user.userId}
                  className={`ranking-item ${user.isCurrentUser ? 'ring-2 ring-yellow-500/50 bg-yellow-500/10' : ''}`}
                >
                  <div className={`ranking-position ${badge.class}`}>
                    {user.rank <= 3 ? badge.icon : user.rank}
                  </div>
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getCosmicAvatar(user.name, user.rank)} flex items-center justify-center font-bold text-white text-sm`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {user.name}
                      {user.isCurrentUser && <span className="ml-2 text-xs text-yellow-400">(Voce)</span>}
                    </div>
                    <div className="text-xs text-gray-500">N{user.currentLevel} • {user.totalQuotas} cotas</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">${user.totalReceived.toLocaleString()}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {ranking.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🌌</div>
              <p className="text-gray-400">Nenhum explorador encontrado</p>
            </div>
          )}
        </div>

        {/* Stats Banner */}
        <div className="cosmic-card p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-400">{ranking.length}</div>
              <div className="text-xs text-gray-500">Exploradores</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                ${ranking.reduce((sum, u) => sum + u.totalReceived, 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Total Distribuido</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {ranking.reduce((sum, u) => sum + u.totalQuotas, 0)}
              </div>
              <div className="text-xs text-gray-500">Cotas Totais</div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="mobile-nav">
        <Link href="/dashboard/cosmos" className="mobile-nav-item">
          <span className="mobile-nav-item-icon">🌌</span>
          <span>Orbita</span>
        </Link>
        <Link href="/dashboard/matrix" className="mobile-nav-item">
          <span className="mobile-nav-item-icon">📊</span>
          <span>Matriz</span>
        </Link>
        <Link href="/dashboard/ranking" className="mobile-nav-item active">
          <span className="mobile-nav-item-icon">🏆</span>
          <span>Ranking</span>
        </Link>
        <Link href="/dashboard/wallet" className="mobile-nav-item">
          <span className="mobile-nav-item-icon">💰</span>
          <span>Carteira</span>
        </Link>
        <Link href="/dashboard/settings" className="mobile-nav-item">
          <span className="mobile-nav-item-icon">⚙️</span>
          <span>Config</span>
        </Link>
      </nav>
    </div>
  )
}
