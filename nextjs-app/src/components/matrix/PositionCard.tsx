'use client'

import { useEffect, useState } from 'react'

interface Position {
  level: number
  position: number
  totalInQueue: number
  quotaNumber: number
  entryDate: string
  score: number
  estimatedCycleTime?: string
}

interface PositionCardProps {
  level: number
  showDetails?: boolean
}

export default function PositionCard({ level, showDetails = true }: PositionCardProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosition = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        const res = await fetch(`/api/matrix/position/${level}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (data.positions) {
          setPositions(data.positions)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPosition()
  }, [level])

  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-6 bg-white/10 rounded mb-2 w-24"></div>
        <div className="h-10 bg-white/10 rounded w-16"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-4 border-red/30">
        <p className="text-red text-sm">{error}</p>
      </div>
    )
  }

  if (positions.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="text-text-secondary text-sm">Nível {level}</div>
        <div className="font-orbitron text-xl text-text-muted mt-1">
          Sem posição
        </div>
      </div>
    )
  }

  const levelValues = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
  const entryValue = levelValues[level - 1] || 0

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-gradient-start to-gradient-mid flex items-center justify-center font-orbitron font-bold text-sm">
            {level}
          </div>
          <div>
            <div className="font-medium">Nível {level}</div>
            <div className="text-xs text-text-secondary">${entryValue} USDT</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-secondary">
            {positions.length} cota{positions.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {positions.map((pos, idx) => (
          <div
            key={`${pos.level}-${pos.quotaNumber}`}
            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="text-xs text-text-muted">#{pos.quotaNumber}</div>
              <div>
                <div className="font-orbitron text-lg font-bold text-gold">
                  #{pos.position}
                </div>
                {showDetails && (
                  <div className="text-xs text-text-secondary">
                    Score: {pos.score.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-secondary">
                de {pos.totalInQueue}
              </div>
              {showDetails && pos.estimatedCycleTime && (
                <div className="text-xs text-green-aurora">
                  ~{pos.estimatedCycleTime}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
