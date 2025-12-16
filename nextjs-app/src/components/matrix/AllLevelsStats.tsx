'use client'

import { useEffect, useState } from 'react'
import { LEVEL_CONFIG } from '@/constants/levels'

interface LevelStat {
  level: number
  totalInQueue: number
  totalCycles: number
  cyclesToday: number
  avgCycleTime: number
}

interface Totals {
  totalCycles: number
  totalInAllQueues: number
  cyclesToday: number
}

export default function AllLevelsStats() {
  const [stats, setStats] = useState<LevelStat[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)

  // Valores conforme documentacao 7iATLAS-DOCUMENTACAO-TECNICA.md
  const levelValues = LEVEL_CONFIG.ENTRY_VALUES

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/matrix/stats')
        const data = await res.json()
        if (data.levels) {
          setStats(data.levels)
          setTotals(data.totals)
        }
      } catch (err) {
        console.error('Erro ao carregar stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-48"></div>
          <div className="grid grid-cols-5 gap-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const maxQueue = Math.max(...stats.map((s) => s.totalInQueue), 1)

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-orbitron text-lg">Estatísticas da Matriz</h2>
        {totals && (
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-text-secondary">Total na fila: </span>
              <span className="font-orbitron font-bold text-cyan">
                {totals.totalInAllQueues}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Ciclos hoje: </span>
              <span className="font-orbitron font-bold text-green-aurora">
                {totals.cyclesToday}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-3">
        {stats.map((stat) => {
          const heightPercent = (stat.totalInQueue / maxQueue) * 100
          return (
            <div
              key={stat.level}
              className="relative p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              {/* Barra de fundo */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gradient-start/20 to-transparent rounded-b-xl transition-all"
                style={{ height: `${Math.max(heightPercent, 10)}%` }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-orbitron font-bold text-sm">
                    N{stat.level}
                  </span>
                  <span className="text-xs text-text-secondary">
                    ${levelValues[stat.level - 1]}
                  </span>
                </div>

                <div className="text-center">
                  <div className="font-orbitron text-2xl font-bold text-cyan">
                    {stat.totalInQueue}
                  </div>
                  <div className="text-xs text-text-muted">na fila</div>
                </div>

                <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs">
                  <div className="text-green-aurora">{stat.cyclesToday} hoje</div>
                  <div className="text-gold">{stat.totalCycles} total</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
