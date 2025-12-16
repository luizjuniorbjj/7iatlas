'use client'

import { useEffect, useState } from 'react'

interface QueueItem {
  position: number
  userName: string
  walletAddress: string
  quotaNumber: number
  entryDate: string
  score: number
  isCurrentUser: boolean
}

interface QueueListProps {
  level: number
  initialPage?: number
}

export default function QueueList({ level, initialPage = 1 }: QueueListProps) {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [search, setSearch] = useState('')
  const [myPage, setMyPage] = useState<number | null>(null)
  const [myPosition, setMyPosition] = useState<number | null>(null)

  const limit = 10

  const fetchQueue = async (pageNum: number, searchTerm?: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        highlight: 'true',
      })
      if (searchTerm) params.set('search', searchTerm)

      const res = await fetch(`/api/matrix/queue/${level}?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()

      if (data.queue) {
        setItems(data.queue)
        setTotalPages(data.totalPages || 1)
        setTotalItems(data.total || 0)
      }
    } catch (err) {
      console.error('Erro ao carregar fila:', err)
    } finally {
      setLoading(false)
    }
  }

  const findMyPosition = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      const res = await fetch(`/api/matrix/queue/${level}/find-me?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (data.found) {
        setMyPage(data.page)
        setMyPosition(data.position)
      }
    } catch (err) {
      console.error('Erro ao encontrar posição:', err)
    }
  }

  useEffect(() => {
    fetchQueue(page, search)
    findMyPosition()
  }, [level])

  useEffect(() => {
    fetchQueue(page, search)
  }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchQueue(1, search)
  }

  const goToMyPosition = () => {
    if (myPage) {
      setPage(myPage)
      fetchQueue(myPage, '')
      setSearch('')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatWallet = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-orbitron text-lg">
          Fila Nível {level}
          <span className="text-text-secondary font-normal ml-2">
            ({totalItems} posições)
          </span>
        </h3>

        {myPosition && (
          <button
            onClick={goToMyPosition}
            className="btn-secondary text-sm px-4 py-2"
          >
            🎯 Ir para minha posição (#{myPosition})
          </button>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou carteira..."
          className="input-field flex-1"
        />
        <button type="submit" className="btn-primary px-4">
          🔍
        </button>
      </form>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          Nenhuma posição encontrada
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={`${item.position}-${item.quotaNumber}`}
              className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                item.isCurrentUser
                  ? 'bg-gradient-to-r from-gradient-start/20 to-gradient-mid/20 border border-gradient-mid/50'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-orbitron font-bold text-lg">
                {item.position}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {item.userName || 'Usuário'}
                  </span>
                  {item.isCurrentUser && (
                    <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-full">
                      Você
                    </span>
                  )}
                  {item.quotaNumber > 1 && (
                    <span className="px-2 py-0.5 bg-cyan/20 text-cyan text-xs rounded-full">
                      Cota #{item.quotaNumber}
                    </span>
                  )}
                </div>
                <div className="text-sm text-text-secondary">
                  {formatWallet(item.walletAddress)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-medium">
                  Score: {Number(item.score).toFixed(2)}
                </div>
                <div className="text-xs text-text-muted">
                  {formatDate(item.entryDate)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-gradient-to-r from-gradient-start to-gradient-mid'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

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
