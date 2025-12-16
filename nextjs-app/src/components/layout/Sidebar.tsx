'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ASSETS } from '@/constants/assets'

interface NavItem {
  href: string
  icon: string
  label: string
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/dashboard/quotas', icon: '🎫', label: 'Cotas' },
  { href: '/dashboard/matrix', icon: '📊', label: 'Matriz' },
  { href: '/dashboard/wallet', icon: '💰', label: 'Carteira' },
  { href: '/dashboard/referrals', icon: '👥', label: 'Indicados' },
  { href: '/dashboard/settings', icon: '⚙️', label: 'Configurações' },
]

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-[#0d0d14] border-r border-white/10 p-6 flex flex-col min-h-screen">
      <Link href="/dashboard" className="mb-8">
        <Image
          src={ASSETS.LOGO}
          alt={ASSETS.APP_NAME}
          width={150}
          height={60}
          priority
        />
      </Link>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.href)
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-purple-500/30'
                : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="pt-4 border-t border-white/10">
        <Link
          href="/api/auth/logout"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <span>🚪</span>
          <span>Sair</span>
        </Link>
      </div>
    </aside>
  )
}
