'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import DashboardLayout from '@/components/layout/DashboardLayout'
import QuotaCard from '@/components/quotas/QuotaCard'
import QuotaList from '@/components/quotas/QuotaList'

interface QuotaInfo {
  level: number
  count: number
  canPurchase: boolean
  reason?: string
}

export default function QuotasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<number | null>(null)
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo[]>([])
  const [userBalance, setUserBalance] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Valores corretos: 10 * 2^(n-1) conforme documentação
  const levelValues = [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120]

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/auth/login')
        return
      }

      // Busca informações de cada nível
      const infos: QuotaInfo[] = []
      for (let level = 1; level <= 10; level++) {
        const res = await fetch(`/api/quotas/check?level=${level}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        infos.push({
          level,
          count: data.currentQuotas || 0,
          canPurchase: data.canPurchase || false,
          reason: data.reason,
        })
      }
      setQuotaInfo(infos)

      // Busca saldo do usuário
      const userRes = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const userData = await userRes.json()
      if (userData.success) {
        setUserBalance(userData.data.stats.balance)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [router])

  const handlePurchase = async (level: number) => {
    setPurchasing(level)
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/quotas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ level }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccess(`Cota do nível ${level} comprada com sucesso!`)
        fetchData() // Atualiza dados
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPurchasing(null)
    }
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
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-orbitron text-2xl font-bold">Comprar Cotas</h1>
          <p className="text-text-secondary">
            Compre múltiplas posições em qualquer nível da matriz
          </p>
        </div>

        <div className="glass-card px-6 py-3">
          <div className="text-sm text-text-secondary">Saldo disponível</div>
          <div className="font-orbitron text-xl font-bold text-green-aurora">
            ${userBalance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="p-4 bg-red/10 border border-red/20 rounded-xl mb-6">
          <p className="text-red">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-aurora/10 border border-green-aurora/20 rounded-xl mb-6">
          <p className="text-green-aurora">{success}</p>
        </div>
      )}

      {/* Grid de Níveis */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {quotaInfo.map((info) => (
          <QuotaCard
            key={info.level}
            level={info.level}
            currentQuotas={info.count}
            canPurchase={info.canPurchase && userBalance >= levelValues[info.level - 1]}
            reason={
              !info.canPurchase
                ? info.reason
                : userBalance < levelValues[info.level - 1]
                ? 'Saldo insuficiente'
                : undefined
            }
            onPurchase={() => handlePurchase(info.level)}
            loading={purchasing === info.level}
          />
        ))}
      </div>

      {/* Lista de Cotas */}
      <QuotaList />
    </DashboardLayout>
  )
}
