'use client'

import { useEffect, useState } from 'react'
import { LEVEL_CONFIG } from '@/constants/levels'

interface Quota {
  id: string
  quotaNumber: number
  status: string
  score: number
  reentries: number
  enteredAt: string
  processedAt: string | null
}

type QuotasByLevel = Record<number, Quota[]>

export default function QuotaList() {
  const [quotasByLevel, setQuotasByLevel] = useState<QuotasByLevel>({})
  const [totalQuotas, setTotalQuotas] = useState(0)
  const [loading, setLoading] = useState(true)

  // Valores conforme documentacao 7iATLAS-DOCUMENTACAO-TECNICA.md
  const levelValues = LEVEL_CONFIG.ENTRY_VALUES

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
          // API returns quotas as object grouped by level
          setQuotasByLevel(data.quotas)
          setTotalQuotas(data.totalQuotas || 0)
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

  const hasQuotas = Object.keys(quotasByLevel).length > 0

  if (!hasQuotas) {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'WAITING':
        return { label: 'Na fila', className: 'bg-cyan/20 text-cyan' }
      case 'PROCESSING':
        return { label: 'Ciclando', className: 'bg-gold/20 text-gold' }
      case 'COMPLETED':
        return { label: 'Completado', className: 'bg-green-aurora/20 text-green-aurora' }
      default:
        return { label: status, className: 'bg-white/20 text-white' }
    }
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-orbitron text-lg mb-4">
        Suas Cotas
        <span className="text-text-secondary font-normal ml-2">
          ({totalQuotas} total)
        </span>
      </h3>

      <div className="space-y-4">
        {Object.entries(quotasByLevel)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([level, levelQuotas]) => (
            <div key={level} className="border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-gradient-start to-gradient-mid flex items-center justify-center font-orbitron font-bold text-sm">
                  {level}
                </div>
                <div className="flex-1">
                  <span className="font-medium">Nivel {level}</span>
                  <span className="text-text-secondary ml-2">
                    ${levelValues[Number(level) - 1]}
                  </span>
                </div>
                <div className="text-sm text-cyan">
                  {levelQuotas.length} cota{levelQuotas.length > 1 ? 's' : ''}
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {levelQuotas.map((quota) => {
                  const statusDisplay = getStatusDisplay(quota.status)
                  return (
                    <div
                      key={quota.id}
                      className="flex items-center justify-between p-3 hover:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-text-muted text-sm">
                          #{quota.quotaNumber}
                        </div>
                        <div>
                          <div className="font-orbitron font-bold text-gold">
                            Score: {quota.score?.toFixed(1) || '0.0'}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {quota.reentries} reentradas
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded-full ${statusDisplay.className}`}>
                          {statusDisplay.label}
                        </div>
                        <div className="text-xs text-text-muted mt-1">
                          {formatDate(quota.enteredAt)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
