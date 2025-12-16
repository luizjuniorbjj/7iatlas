'use client'

import { useEffect, useState } from 'react'
import { LEVEL_CONFIG } from '@/constants/levels'

interface LevelStats {
  level: number
  totalInQueue: number
  totalCycles: number
  cyclesToday: number
  avgCycleTime: number
  estimatedTimeToReceive: number
}

interface LevelStatsCardProps {
  level: number
}

export default function LevelStatsCard({ level }: LevelStatsCardProps) {
  const [stats, setStats] = useState<LevelStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Valores conforme documentacao 7iATLAS-DOCUMENTACAO-TECNICA.md
  const levelValues = LEVEL_CONFIG.ENTRY_VALUES
  const receiveValues = LEVEL_CONFIG.REWARD_VALUES

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/matrix/stats/${level}`)
        const data = await res.json()
        if (data) {
          setStats(data)
        }
      } catch (err) {
        console.error('Erro ao carregar stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [level])

  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-20 mb-2"></div>
        <div className="h-8 bg-white/10 rounded w-24 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded"></div>
          <div className="h-3 bg-white/10 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="glass-card p-4">
        <p className="text-text-muted text-sm">Dados indisponíveis</p>
      </div>
    )
  }

  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}min`
    if (hours < 24) return `${Math.round(hours)}h`
    return `${Math.round(hours / 24)}d`
  }

  return (
    <div className="glass-card p-4 hover:border-gradient-mid/50 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-gradient-start to-gradient-mid flex items-center justify-center font-orbitron font-bold">
          {level}
        </div>
        <div>
          <div className="font-medium">Nível {level}</div>
          <div className="text-sm text-text-secondary">
            ${levelValues[level - 1]} → ${receiveValues[level - 1].toFixed(0)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary text-sm">Na fila</span>
          <span className="font-orbitron font-bold text-cyan">
            {stats.totalInQueue}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-text-secondary text-sm">Ciclos hoje</span>
          <span className="font-orbitron font-bold text-green-aurora">
            {stats.cyclesToday}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-text-secondary text-sm">Total ciclos</span>
          <span className="font-orbitron font-bold text-gold">
            {stats.totalCycles}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-text-secondary text-sm">Tempo médio</span>
          <span className="font-medium text-text-primary">
            {formatTime(stats.avgCycleTime)}
          </span>
        </div>
      </div>

      {stats.estimatedTimeToReceive > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <div className="text-xs text-text-secondary mb-1">
              Estimativa p/ ciclar
            </div>
            <div className="font-orbitron text-lg text-gradient-mid">
              ~{formatTime(stats.estimatedTimeToReceive)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
