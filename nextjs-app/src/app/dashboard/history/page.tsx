'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ASSETS } from '@/constants/assets'

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  description?: string
  txHash?: string
  createdAt: string
  confirmedAt?: string
}

interface HistoryData {
  transactions: Transaction[]
  stats: {
    totalDeposits: number
    totalCycleRewards: number
    totalBonus: number
    totalWithdrawals: number
    totalTransfersIn: number
    totalTransfersOut: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
  DEPOSIT: { label: 'Depósito', icon: '📥', color: 'text-green-aurora' },
  CYCLE_REWARD: { label: 'Ciclo Completado', icon: '🔄', color: 'text-cyan' },
  BONUS_REFERRAL: { label: 'Bônus Indicação', icon: '🎁', color: 'text-gold' },
  WITHDRAWAL: { label: 'Saque', icon: '📤', color: 'text-red' },
  TRANSFER_IN: { label: 'Recebido', icon: '💰', color: 'text-green-aurora' },
  TRANSFER_OUT: { label: 'Enviado', icon: '💸', color: 'text-pink-star' }
}

export default function HistoryPage() {
  const router = useRouter()
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    const params = new URLSearchParams({ page: String(page), limit: '15' })
    if (filter) params.append('type', filter)

    fetch(`/api/history?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.data)
        }
      })
      .finally(() => setLoading(false))
  }, [router, page, filter])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Image
            src={ASSETS.LOGO}
            alt={ASSETS.APP_NAME}
            width={200}
            height={80}
            priority
            className="mx-auto animate-pulse"
          />
          <p className="text-text-secondary mt-4">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-orbitron text-2xl font-bold">Histórico</h1>
          <p className="text-text-secondary">Todas as suas transações</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          ← Voltar
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4 mb-8">
        <div className="stat-card">
          <div className="text-xl mb-2">📥</div>
          <div className="font-orbitron text-lg font-bold text-green-aurora">
            ${data?.stats.totalDeposits.toFixed(2) || '0'}
          </div>
          <div className="text-text-secondary text-xs">Depósitos</div>
        </div>

        <div className="stat-card">
          <div className="text-xl mb-2">🔄</div>
          <div className="font-orbitron text-lg font-bold text-cyan">
            ${data?.stats.totalCycleRewards.toFixed(2) || '0'}
          </div>
          <div className="text-text-secondary text-xs">Ciclos</div>
        </div>

        <div className="stat-card">
          <div className="text-xl mb-2">🎁</div>
          <div className="font-orbitron text-lg font-bold text-gold">
            ${data?.stats.totalBonus.toFixed(2) || '0'}
          </div>
          <div className="text-text-secondary text-xs">Bônus</div>
        </div>

        <div className="stat-card">
          <div className="text-xl mb-2">📤</div>
          <div className="font-orbitron text-lg font-bold text-red">
            ${data?.stats.totalWithdrawals.toFixed(2) || '0'}
          </div>
          <div className="text-text-secondary text-xs">Saques</div>
        </div>

        <div className="stat-card">
          <div className="text-xl mb-2">💰</div>
          <div className="font-orbitron text-lg font-bold text-green-aurora">
            ${data?.stats.totalTransfersIn.toFixed(2) || '0'}
          </div>
          <div className="text-text-secondary text-xs">Recebidos</div>
        </div>

        <div className="stat-card">
          <div className="text-xl mb-2">💸</div>
          <div className="font-orbitron text-lg font-bold text-pink-star">
            ${data?.stats.totalTransfersOut.toFixed(2) || '0'}
          </div>
          <div className="text-text-secondary text-xs">Enviados</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => { setFilter(''); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${!filter ? 'bg-gradient-mid text-white' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Todos
          </button>
          <button
            onClick={() => { setFilter('DEPOSIT'); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === 'DEPOSIT' ? 'bg-green-aurora/20 text-green-aurora' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Depósitos
          </button>
          <button
            onClick={() => { setFilter('CYCLE_REWARD'); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === 'CYCLE_REWARD' ? 'bg-cyan/20 text-cyan' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Ciclos
          </button>
          <button
            onClick={() => { setFilter('BONUS_REFERRAL'); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === 'BONUS_REFERRAL' ? 'bg-gold/20 text-gold' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Bônus
          </button>
          <button
            onClick={() => { setFilter('WITHDRAWAL'); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === 'WITHDRAWAL' ? 'bg-red/20 text-red' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Saques
          </button>
          <button
            onClick={() => { setFilter('TRANSFER_IN'); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === 'TRANSFER_IN' ? 'bg-green-aurora/20 text-green-aurora' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Recebidos
          </button>
          <button
            onClick={() => { setFilter('TRANSFER_OUT'); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === 'TRANSFER_OUT' ? 'bg-pink-star/20 text-pink-star' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Enviados
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-card p-6">
        {data?.transactions.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <div className="text-4xl mb-4">📋</div>
            <p>Nenhuma transação encontrada</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {data?.transactions.map((tx) => {
                const typeInfo = typeLabels[tx.type] || { label: tx.type, icon: '📌', color: 'text-white' }

                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                        {typeInfo.icon}
                      </div>
                      <div>
                        <div className="font-medium">{typeInfo.label}</div>
                        <div className="text-sm text-text-secondary">
                          {tx.description || formatDate(tx.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-orbitron font-bold ${typeInfo.color}`}>
                        {tx.type === 'WITHDRAWAL' || tx.type === 'TRANSFER_OUT' ? '-' : '+'}
                        ${tx.amount.toFixed(2)}
                      </div>
                      <div className="text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${
                          tx.status === 'CONFIRMED' ? 'bg-green-aurora/20 text-green-aurora' :
                          tx.status === 'PENDING' ? 'bg-gold/20 text-gold' : 'bg-red/20 text-red'
                        }`}>
                          {tx.status === 'CONFIRMED' ? 'Confirmado' :
                           tx.status === 'PENDING' ? 'Pendente' : 'Falhou'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-white/5 disabled:opacity-50 hover:bg-white/10"
                >
                  ← Anterior
                </button>
                <span className="px-4 py-2">
                  Página {page} de {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="px-4 py-2 rounded-lg bg-white/5 disabled:opacity-50 hover:bg-white/10"
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
