'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Referral {
  id: string
  name?: string
  email?: string
  walletAddress: string
  status: string
  currentLevel: number
  createdAt: string
  activatedAt?: string
  totalBonus: number
}

interface ReferralData {
  referralCode: string
  referralLink: string
  stats: {
    total: number
    active: number
    pending: number
    totalBonus: number
  }
  bonusTier: {
    percent: number
    label: string
    nextTier?: { needed: number; percent: number }
  }
  referrals: Referral[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function ReferralsPage() {
  const router = useRouter()
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    fetch(`/api/referrals?page=${page}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.data)
        }
      })
      .finally(() => setLoading(false))
  }, [router, page])

  const copyLink = () => {
    if (data?.referralLink) {
      navigator.clipboard.writeText(data.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatWallet = (wallet: string) => {
    return `${wallet.substring(0, 6)}...${wallet.substring(38)}`
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
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-orbitron text-2xl font-bold">Indicações</h1>
          <p className="text-text-secondary">Gerencie seus indicados e acompanhe seus ganhos</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          ← Voltar
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-cyan/20 flex items-center justify-center text-xl mb-3">👥</div>
          <div className="font-orbitron text-2xl font-bold text-cyan">{data?.stats.total || 0}</div>
          <div className="text-text-secondary text-xs">Total Indicados</div>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-green-aurora/20 flex items-center justify-center text-xl mb-3">✓</div>
          <div className="font-orbitron text-2xl font-bold text-green-aurora">{data?.stats.active || 0}</div>
          <div className="text-text-secondary text-xs">Ativos</div>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-xl mb-3">⏳</div>
          <div className="font-orbitron text-2xl font-bold text-gold">{data?.stats.pending || 0}</div>
          <div className="text-text-secondary text-xs">Pendentes</div>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-pink-star/20 flex items-center justify-center text-xl mb-3">💰</div>
          <div className="font-orbitron text-2xl font-bold text-pink-star">${data?.stats.totalBonus?.toFixed(2) || '0.00'}</div>
          <div className="text-text-secondary text-xs">Total em Bônus</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Referral Link Card */}
        <div className="glass-card p-6">
          <h2 className="font-orbitron text-lg mb-4">Seu Link de Indicação</h2>

          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <p className="text-sm text-text-secondary mb-2">Código:</p>
            <div className="font-orbitron text-xl text-cyan mb-4">{data?.referralCode}</div>

            <p className="text-sm text-text-secondary mb-2">Link:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={data?.referralLink || ''}
                readOnly
                className="input-field text-sm flex-1"
              />
              <button onClick={copyLink} className="btn-primary px-4">
                {copied ? '✓' : '📋'}
              </button>
            </div>
          </div>

          {/* Bonus Tier */}
          <div className="p-4 bg-gradient-to-r from-gradient-start/10 to-gradient-end/10 rounded-xl border border-gradient-mid/30">
            <div className="text-center mb-3">
              <div className="text-3xl mb-2">🎁</div>
              <div className={`font-orbitron text-2xl font-bold ${
                data?.bonusTier.percent === 40 ? 'text-green-aurora' :
                data?.bonusTier.percent === 20 ? 'text-gold' : 'text-red'
              }`}>
                {data?.bonusTier.label} de Bônus
              </div>
              <div className="text-sm text-text-secondary">
                Você tem {data?.stats.active || 0} indicados ativos
              </div>
            </div>

            {data?.bonusTier.nextTier && (
              <div className="text-center text-sm mt-2 p-2 bg-white/5 rounded-lg">
                <span className="text-text-secondary">Faltam </span>
                <span className="text-gold font-bold">{data.bonusTier.nextTier.needed}</span>
                <span className="text-text-secondary"> indicados para </span>
                <span className="text-green-aurora font-bold">{data.bonusTier.nextTier.percent}%</span>
              </div>
            )}
          </div>

          {/* Bonus Rules */}
          <div className="mt-4 text-xs text-text-secondary space-y-1">
            <div className="flex justify-between">
              <span>0-4 indicados:</span>
              <span className="text-red">0%</span>
            </div>
            <div className="flex justify-between">
              <span>5-9 indicados:</span>
              <span className="text-gold">20%</span>
            </div>
            <div className="flex justify-between">
              <span>10+ indicados:</span>
              <span className="text-green-aurora">40%</span>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        <div className="col-span-2 glass-card p-6">
          <h2 className="font-orbitron text-lg mb-4">Seus Indicados</h2>

          {data?.referrals.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <div className="text-4xl mb-4">👥</div>
              <p>Você ainda não tem indicados</p>
              <p className="text-sm mt-2">Compartilhe seu link e comece a ganhar bônus!</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-text-secondary text-sm border-b border-white/10">
                      <th className="pb-3">Usuário</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Nível</th>
                      <th className="pb-3">Bônus Gerado</th>
                      <th className="pb-3">Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.referrals.map((ref) => (
                      <tr key={ref.id} className="border-b border-white/5">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gradient-start to-gradient-end flex items-center justify-center text-sm font-bold">
                              {ref.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="font-medium">{ref.name || 'Sem nome'}</div>
                              <div className="text-xs text-text-secondary">{formatWallet(ref.walletAddress)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            ref.status === 'ACTIVE' ? 'bg-green-aurora/20 text-green-aurora' : 'bg-gold/20 text-gold'
                          }`}>
                            {ref.status === 'ACTIVE' ? 'Ativo' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-orbitron">{ref.currentLevel}</span>
                        </td>
                        <td className="py-3">
                          <span className="text-green-aurora font-medium">${ref.totalBonus.toFixed(2)}</span>
                        </td>
                        <td className="py-3 text-text-secondary text-sm">
                          {formatDate(ref.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded bg-white/5 disabled:opacity-50"
                  >
                    ←
                  </button>
                  <span className="px-3 py-1">
                    {page} / {data.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
                    className="px-3 py-1 rounded bg-white/5 disabled:opacity-50"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
