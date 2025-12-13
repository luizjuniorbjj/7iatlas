'use client'

import Link from 'next/link'
import NotificationSettings from '@/components/notifications/NotificationSettings'
import NotificationHistory from '@/components/notifications/NotificationHistory'

export default function NotificationsPage() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-card-solid border-r border-white/10 p-6 flex flex-col">
        <Link href="/dashboard" className="font-orbitron text-2xl gradient-text mb-8">
          7iATLAS
        </Link>

        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="nav-item">
            <span>🏠</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard/quotas" className="nav-item">
            <span>🎫</span>
            <span>Cotas</span>
          </Link>
          <Link href="/dashboard/matrix" className="nav-item">
            <span>📊</span>
            <span>Matriz</span>
          </Link>
          <Link href="/dashboard/transfers" className="nav-item">
            <span>💸</span>
            <span>Transferências</span>
          </Link>
          <Link href="/dashboard/notifications" className="nav-item active">
            <span>🔔</span>
            <span>Notificações</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-2xl font-bold">Notificações</h1>
          <p className="text-text-secondary">
            Configure suas preferências de notificação
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Configurações */}
          <NotificationSettings />

          {/* Histórico */}
          <NotificationHistory />
        </div>
      </main>
    </div>
  )
}
