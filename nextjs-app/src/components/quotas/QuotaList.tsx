'use client'

import { useEffect, useState } from 'react'

interface Quota {
  level: number
  quotaNumber: number
  position: number
  totalInQueue: number
  status: string
  entryDate: string
  cyclesCompleted: number
}

export default function QuotaList() {
  const [quotas, setQuotas] = useState<Quota[]>([])
  const [loading, setLoading] = useState(true)

  const levelValues = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

  useEffect(() => {
    const fetchQuotas = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        const res = await fetch('/api/quotas', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (data.quotas) {
          setQuotas(data.quotas)
        }
      } catch (err) {
        console.error('Erro ao carregar cotas:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuotas()
  }, [])

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (quotas.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="font-orbitron text-lg mb-2">Nenhuma cota ativa</h3>
        <p className="text-text-secondary text-sm">
          Compre sua primeira cota para entrar na matriz
        </p>
      </div>
    )
  }

  const groupedByLevel = quotas.reduce((acc, quota) => {
    if (!acc[quota.level]) acc[quota.level] = []
    acc[quota.level].push(quota)
    return acc
  }, {} as Record<number, Quota[]>)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-orbitron text-lg mb-4">
        Suas Cotas
        <span className="text-text-secondary font-normal ml-2">
          ({quotas.length} total)
        </span>
      </h3>

      <div className="space-y-4">
        {Object.entries(groupedByLevel)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([level, levelQuotas]) => (
            <div key={level} className="border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-gradient-start to-gradient-mid flex items-center justify-center font-orbitron font-bold text-sm">
                  {level}
                </div>
                <div className="flex-1">
                  <span className="font-medium">Nível {level}</span>
                  <span className="text-text-secondary ml-2">
                    ${levelValues[Number(level) - 1]}
                  </span>
                </div>
                <div className="text-sm text-cyan">
                  {levelQuotas.length} cota{levelQuotas.length > 1 ? 's' : ''}
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {levelQuotas.map((quota) => (
                  <div
                    key={`${quota.level}-${quota.quotaNumber}`}
                    className="flex items-center justify-between p-3 hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-text-muted text-sm">
                        #{quota.quotaNumber}
                      </div>
                      <div>
                        <div className="font-orbitron font-bold text-gold">
                          Posição #{quota.position}
                        </div>
                        <div className="text-xs text-text-secondary">
                          de {quota.totalInQueue} na fila
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-xs px-2 py-1 rounded-full ${
                          quota.status === 'IN_QUEUE'
                            ? 'bg-cyan/20 text-cyan'
                            : quota.status === 'CYCLING'
                            ? 'bg-gold/20 text-gold'
                            : 'bg-green-aurora/20 text-green-aurora'
                        }`}
                      >
                        {quota.status === 'IN_QUEUE'
                          ? 'Na fila'
                          : quota.status === 'CYCLING'
                          ? 'Ciclando'
                          : 'Completado'}
                      </div>
                      <div className="text-xs text-text-muted mt-1">
                        {formatDate(quota.entryDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
