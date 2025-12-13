'use client'

import { useEffect, useState } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  channel: string
  status: string
  createdAt: string
  readAt?: string
}

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchNotifications = async (pageNum: number, append = false) => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      const limit = 20
      const offset = (pageNum - 1) * limit

      const res = await fetch(
        `/api/notifications?type=history&limit=${limit}&offset=${offset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const data = await res.json()

      if (data.history) {
        if (append) {
          setNotifications((prev) => [...prev, ...data.history])
        } else {
          setNotifications(data.history)
        }
        setHasMore(data.history.length === limit)
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications(1)
  }, [])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchNotifications(nextPage, true)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = diff / (1000 * 60 * 60)

    if (hours < 1) {
      const minutes = Math.round(diff / (1000 * 60))
      return `${minutes}min atrás`
    }
    if (hours < 24) {
      return `${Math.round(hours)}h atrás`
    }
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'QUEUE_ADVANCE':
        return '📈'
      case 'CYCLE_COMPLETED':
        return '💰'
      case 'BONUS_RECEIVED':
        return '🎁'
      case 'TRANSFER_RECEIVED':
        return '↓'
      case 'TRANSFER_SENT':
        return '↑'
      case 'WELCOME':
        return '👋'
      case 'SYSTEM':
        return '⚙️'
      default:
        return '🔔'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CYCLE_COMPLETED':
      case 'BONUS_RECEIVED':
        return 'bg-green-aurora/20 text-green-aurora'
      case 'QUEUE_ADVANCE':
        return 'bg-cyan/20 text-cyan'
      case 'TRANSFER_RECEIVED':
        return 'bg-gold/20 text-gold'
      case 'TRANSFER_SENT':
        return 'bg-pink-star/20 text-pink-star'
      default:
        return 'bg-white/10 text-text-secondary'
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="text-4xl mb-3">🔔</div>
        <h3 className="font-orbitron text-lg mb-2">Sem notificações</h3>
        <p className="text-text-secondary text-sm">
          Você ainda não recebeu nenhuma notificação
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-orbitron text-lg mb-4">Histórico de Notificações</h3>

      <div className="space-y-3">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-xl transition-colors ${
              notif.readAt ? 'bg-white/5' : 'bg-white/10 border border-gradient-mid/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getTypeColor(
                  notif.type
                )}`}
              >
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{notif.title}</span>
                  {!notif.readAt && (
                    <span className="w-2 h-2 rounded-full bg-gradient-mid" />
                  )}
                </div>
                <p className="text-sm text-text-secondary">{notif.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                  <span>{formatDate(notif.createdAt)}</span>
                  <span className="px-2 py-0.5 bg-white/5 rounded">
                    {notif.channel === 'EMAIL' ? '📧 Email' : '🔔 Push'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          className="btn-secondary w-full mt-4 py-3"
        >
          Carregar mais
        </button>
      )}
    </div>
  )
}
