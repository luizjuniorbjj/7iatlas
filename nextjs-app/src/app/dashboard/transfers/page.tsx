'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import DashboardLayout from '@/components/layout/DashboardLayout'
import TransferForm from '@/components/transfer/TransferForm'
import TransferHistory from '@/components/transfer/TransferHistory'

export default function TransfersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (data.success) {
        setBalance(data.data.stats.balance)
      }
    } catch (err) {
      console.error('Erro ao carregar saldo:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [router, refreshKey])

  const handleTransferSuccess = () => {
    setRefreshKey((k) => k + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="7iATLAS"
            width={200}
            height={67}
            className="mx-auto animate-pulse"
            priority
          />
          <p className="text-text-secondary mt-4">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-orbitron text-2xl font-bold">Transferências</h1>
        <p className="text-text-secondary">
          Transfira saldo para outros usuários da plataforma
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Formulário de transferência */}
        <TransferForm balance={balance} onSuccess={handleTransferSuccess} />

        {/* Histórico */}
        <TransferHistory key={refreshKey} />
      </div>

      {/* Informações de segurança */}
      <div className="mt-8 glass-card p-6">
        <h3 className="font-orbitron text-lg mb-4">Informações de Segurança</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔐</div>
            <div>
              <div className="font-medium mb-1">PIN de Segurança</div>
              <p className="text-sm text-text-secondary">
                Todas as transferências requerem seu PIN de 4-6 dígitos
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚡</div>
            <div>
              <div className="font-medium mb-1">Instantâneo</div>
              <p className="text-sm text-text-secondary">
                Transferências são processadas imediatamente na plataforma
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-2xl">🛡️</div>
            <div>
              <div className="font-medium mb-1">Limites Diários</div>
              <p className="text-sm text-text-secondary">
                Existe um limite diário para proteger sua conta
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
