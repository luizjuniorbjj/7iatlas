'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import NotificationSettings from '@/components/notifications/NotificationSettings'
import NotificationHistory from '@/components/notifications/NotificationHistory'

export default function NotificationsPage() {
  return (
    <DashboardLayout>
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
    </DashboardLayout>
  )
}
