'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface UserInfo {
  name?: string
  walletAddress: string
  currentLevel: number
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [notifications, setNotifications] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    // Busca dados do usuário
    fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data.user)
        }
      })
      .catch(() => {})

    // Busca notificações
    fetch('/api/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNotifications(data.count)
        }
      })
      .catch(() => setNotifications(3))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    router.push('/auth/login')
  }

  const menuItems = [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/dashboard/quotas', icon: '🎫', label: 'Cotas' },
    { href: '/dashboard/matrix', icon: '📊', label: 'Matriz' },
    { href: '/dashboard/transfers', icon: '💸', label: 'Transferências' },
    { href: '/dashboard/referrals', icon: '👥', label: 'Indicações' },
    { href: '/dashboard/history', icon: '📜', label: 'Histórico' },
    { href: '/dashboard/jupiter-pool', icon: '🪐', label: 'Jupiter Pool' },
    { href: '/dashboard/notifications', icon: '🔔', label: 'Notificações', badge: notifications },
    { href: '/dashboard/settings', icon: '⚙️', label: 'Configurações' },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-card-solid border-r border-white/10 p-6 flex flex-col">
        <Link href="/dashboard" className="mb-8">
          <Image
            src="/logo.png"
            alt="7iATLAS"
            width={150}
            height={50}
            className="h-auto"
            priority
          />
        </Link>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="w-5 h-5 bg-red rounded-full text-xs flex items-center justify-center font-bold">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User Info */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gradient-start to-gradient-end flex items-center justify-center font-orbitron font-bold">
              {user?.name?.charAt(0) || user?.walletAddress?.substring(2, 4).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {user?.name || 'Usuário'}
              </div>
              <div className="text-xs text-green-aurora">
                Nível {user?.currentLevel || 1} • Pioneer
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-4 py-2 text-red/80 hover:text-red transition-colors text-sm"
          >
            🚪 Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
