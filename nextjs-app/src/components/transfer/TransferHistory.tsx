'use client'

import { useEffect, useState } from 'react'

interface Transfer {
  id: string
  type: 'sent' | 'received'
  amount: number
  otherPartyName: string
  otherPartyWallet: string
  status: string
  createdAt: string
}

export default function TransferHistory() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTransfers = async (pageNum: number) => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      const res = await fetch(`/api/transfers?page=${pageNum}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (data.transfers) {
        setTransfers(data.transfers)
        setTotalPages(data.totalPages || 1)
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransfers(page)
  }, [page])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatWallet = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (transfers.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="text-4xl mb-3">📜</div>
        <h3 className="font-orbitron text-lg mb-2">Sem transferências</h3>
        <p className="text-text-secondary text-sm">
          Você ainda não realizou nenhuma transferência
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-orbitron text-lg mb-4">Histórico de Transferências</h3>

      <div className="space-y-3">
        {transfers.map((transfer) => (
          <div
            key={transfer.id}
            className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                transfer.type === 'received'
                  ? 'bg-green-aurora/20'
                  : 'bg-red/20'
              }`}
            >
              {transfer.type === 'received' ? '↓' : '↑'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {transfer.otherPartyName || 'Usuário'}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    transfer.status === 'COMPLETED'
                      ? 'bg-green-aurora/20 text-green-aurora'
                      : transfer.status === 'PENDING'
                      ? 'bg-gold/20 text-gold'
                      : 'bg-red/20 text-red'
                  }`}
                >
                  {transfer.status === 'COMPLETED'
                    ? 'Concluído'
                    : transfer.status === 'PENDING'
                    ? 'Pendente'
                    : 'Falhou'}
                </span>
              </div>
              <div className="text-sm text-text-secondary">
                {formatWallet(transfer.otherPartyWallet)}
              </div>
            </div>

            <div className="text-right">
              <div
                className={`font-orbitron font-bold ${
                  transfer.type === 'received'
                    ? 'text-green-aurora'
                    : 'text-red'
                }`}
              >
                {transfer.type === 'received' ? '+' : '-'}$
                {transfer.amount.toFixed(2)}
              </div>
              <div className="text-xs text-text-muted">
                {formatDate(transfer.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-3 py-2 disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-sm text-text-secondary">
            {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary px-3 py-2 disabled:opacity-50"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
