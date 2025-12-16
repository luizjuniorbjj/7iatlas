'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LEVEL_CONFIG } from '@/constants/levels'
import { ASSETS } from '@/constants/assets'

// Tipos
interface WalletSummary {
  balance: number
  totalDonated: number
  totalReceived: number
  totalReceivedCycles: number
  totalReceivedBonus: number
  totalInvested: number
  totalWithdrawn: number
  iec: number
  totalCyclesCompleted: number
  monthlyReceived: number
}

interface CycleReceipt {
  level: number
  cycles: number
  valuePerCycle: number
  total: number
  lastReceived: string
}

interface BonusReceipt {
  id: string
  amount: number
  description: string
  receivedAt: string
}

interface Transaction {
  id: string
  type: string
  typeLabel: string
  icon: string
  color: string
  amount: number
  description: string
  balanceAfter: number
  date: string
}

interface LevelAvailability {
  level: number
  entryValue: number
  rewardValue: number
  currentQuotas: number
  maxQuotas: number
  availableSlots: number
  canAfford: boolean
  canBuy: boolean
  maxCanBuy: number
}

type TabType = 'overview' | 'quotas' | 'transfer' | 'receipts' | 'extract'

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<WalletSummary | null>(null)
  const [receipts, setReceipts] = useState<{ cycles: CycleReceipt[], bonus: BonusReceipt[] }>({ cycles: [], bonus: [] })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [levelsAvailability, setLevelsAvailability] = useState<LevelAvailability[]>([])

  // Estados para ações
  const [donateAmount, setDonateAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferUser, setTransferUser] = useState<{ name: string, email: string } | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [quotaQuantity, setQuotaQuantity] = useState(1)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Buscar dados
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}` }

      // Buscar resumo
      const summaryRes = await fetch('/api/wallet/summary', { headers })
      const summaryData = await summaryRes.json()
      if (!summaryData.error) setSummary(summaryData)

      // Buscar recebimentos
      const receiptsRes = await fetch('/api/wallet/receipts', { headers })
      const receiptsData = await receiptsRes.json()
      if (!receiptsData.error) {
        setReceipts({
          cycles: receiptsData.cyclesByLevel || [],
          bonus: receiptsData.bonusReceipts || [],
        })
      }

      // Buscar transações
      const txRes = await fetch('/api/wallet/transactions?limit=20', { headers })
      const txData = await txRes.json()
      if (!txData.error) setTransactions(txData.transactions || [])

      // Buscar disponibilidade de cotas
      const quotasRes = await fetch('/api/quotas/purchase', { headers })
      const quotasData = await quotasRes.json()
      if (!quotasData.error) setLevelsAvailability(quotasData.levels || [])

    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Ações
  const handleDonate = async () => {
    if (!donateAmount || parseFloat(donateAmount) <= 0) return
    setActionLoading(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/wallet/donate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: parseFloat(donateAmount) }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: `Doação de $${donateAmount} realizada!` })
        setDonateAmount('')
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao processar doação' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return
    setActionLoading(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: parseFloat(withdrawAmount) }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: `Saque de $${withdrawAmount} solicitado!` })
        setWithdrawAmount('')
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao processar saque' })
    } finally {
      setActionLoading(false)
    }
  }

  const searchUser = async (code: string) => {
    if (code.length < 3) {
      setTransferUser(null)
      return
    }

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/users/search?q=${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (data.user) {
        setTransferUser(data.user)
      } else {
        setTransferUser(null)
      }
    } catch {
      setTransferUser(null)
    }
  }

  const handleTransfer = async () => {
    if (!transferAmount || !transferTo || parseFloat(transferAmount) <= 0) return
    setActionLoading(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toUserCode: transferTo,
          amount: parseFloat(transferAmount),
        }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: `Transferência de $${transferAmount} realizada!` })
        setTransferAmount('')
        setTransferTo('')
        setTransferUser(null)
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao processar transferência' })
    } finally {
      setActionLoading(false)
    }
  }

  const handlePurchaseQuota = async () => {
    if (!selectedLevel) return
    setActionLoading(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/quotas/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ level: selectedLevel, quantity: quotaQuantity }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setSelectedLevel(null)
        setQuotaQuantity(1)
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao comprar cota' })
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`
    if (diffHours > 0) return `há ${diffHours}h`
    return 'agora'
  }

  // Tabs
  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: '📊' },
    { id: 'quotas', label: 'Comprar Cotas', icon: '🎫' },
    { id: 'transfer', label: 'Transferir', icon: '💸' },
    { id: 'receipts', label: 'Recebimentos', icon: '📈' },
    { id: 'extract', label: 'Extrato', icon: '🧾' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0d0d14] border-r border-white/10 p-6 flex flex-col">
        <Link href="/dashboard" className="mb-8">
          <Image src={ASSETS.LOGO} alt={ASSETS.APP_NAME} width={150} height={60} priority />
        </Link>

        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
            <span>🏠</span><span>Dashboard</span>
          </Link>
          <Link href="/dashboard/quotas" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
            <span>🎫</span><span>Cotas</span>
          </Link>
          <Link href="/dashboard/matrix" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
            <span>📊</span><span>Matriz</span>
          </Link>
          <Link href="/dashboard/wallet" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-purple-500/30">
            <span>💰</span><span>Carteira</span>
          </Link>
          <Link href="/dashboard/referrals" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
            <span>👥</span><span>Indicados</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-[#0a0a0f]">
        <div className="mb-6">
          <h1 className="font-orbitron text-2xl font-bold text-white mb-1">Minha Carteira</h1>
          <p className="text-gray-400 text-sm">Gerencie seu saldo, compre cotas e acompanhe seus recebimentos</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            {/* Mensagem de feedback */}
            {message && (
              <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'}`}>
                {message.text}
              </div>
            )}

            {/* Saldo Principal */}
            <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Saldo Disponível</p>
                  <p className="font-orbitron text-4xl font-bold text-white">
                    ${summary?.balance.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition-colors"
                  >
                    + Doar
                  </button>
                  <button
                    onClick={() => setActiveTab('quotas')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-white transition-colors"
                  >
                    🎫 Comprar Cota
                  </button>
                  <button
                    onClick={() => setActiveTab('transfer')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white transition-colors"
                  >
                    💸 Transferir
                  </button>
                </div>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Doado</p>
                <p className="font-orbitron text-xl font-bold text-white">${summary?.totalDonated.toFixed(0) || 0}</p>
                <p className="text-gray-500 text-xs">total</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Recebido</p>
                <p className="font-orbitron text-xl font-bold text-emerald-400">${summary?.totalReceived.toFixed(0) || 0}</p>
                <p className="text-gray-500 text-xs">ciclos + bônus</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Investido</p>
                <p className="font-orbitron text-xl font-bold text-white">${summary?.totalInvested.toFixed(0) || 0}</p>
                <p className="text-gray-500 text-xs">em cotas</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">IEC</p>
                <p className="font-orbitron text-xl font-bold text-yellow-400">{summary?.iec.toFixed(0) || 0}%</p>
                <p className="text-gray-500 text-xs">Índice de Execução</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Conteúdo das Tabs */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">

              {/* VISÃO GERAL */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h2 className="font-orbitron text-lg text-white mb-4">Ações Rápidas</h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Doar */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-3">💵 Fazer Doação</h3>
                      <div className="flex gap-2 mb-3">
                        {[10, 50, 100, 500].map(v => (
                          <button
                            key={v}
                            onClick={() => setDonateAmount(v.toString())}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition-colors"
                          >
                            ${v}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={donateAmount}
                          onChange={(e) => setDonateAmount(e.target.value)}
                          placeholder="Valor"
                          className="flex-1 px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500"
                        />
                        <button
                          onClick={handleDonate}
                          disabled={actionLoading || !donateAmount}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg font-medium text-white transition-colors"
                        >
                          Doar
                        </button>
                      </div>
                    </div>

                    {/* Sacar */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-3">📤 Solicitar Saque</h3>
                      <p className="text-gray-400 text-xs mb-3">Saldo disponível: ${summary?.balance.toFixed(2)}</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Valor"
                          max={summary?.balance}
                          className="flex-1 px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500"
                        />
                        <button
                          onClick={handleWithdraw}
                          disabled={actionLoading || !withdrawAmount || parseFloat(withdrawAmount) > (summary?.balance || 0)}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg font-medium text-white transition-colors"
                        >
                          Sacar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Resumo do Mês */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h3 className="text-white font-medium mb-3">📅 Este Mês</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-400">${summary?.monthlyReceived.toFixed(0) || 0}</p>
                        <p className="text-gray-400 text-xs">Recebido</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{summary?.totalCyclesCompleted || 0}</p>
                        <p className="text-gray-400 text-xs">Ciclos Completados</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-400">${summary?.totalReceivedBonus.toFixed(0) || 0}</p>
                        <p className="text-gray-400 text-xs">Bônus Indicação</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COMPRAR COTAS */}
              {activeTab === 'quotas' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-orbitron text-lg text-white">Comprar Cotas</h2>
                    <p className="text-gray-400 text-sm">Saldo: <span className="text-white font-bold">${summary?.balance.toFixed(2)}</span></p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    {levelsAvailability.map(level => (
                      <button
                        key={level.level}
                        onClick={() => level.canBuy && setSelectedLevel(level.level)}
                        disabled={!level.canBuy}
                        className={`p-3 rounded-lg text-left transition-all ${
                          selectedLevel === level.level
                            ? 'bg-purple-600 border-2 border-purple-400'
                            : level.canBuy
                            ? 'bg-white/5 border border-white/20 hover:border-purple-500/50'
                            : 'bg-white/5 border border-white/10 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-orbitron font-bold text-white">N{level.level}</span>
                          {level.canBuy ? (
                            <span className="text-green-400 text-xs">✓</span>
                          ) : (
                            <span className="text-red-400 text-xs">✗</span>
                          )}
                        </div>
                        <p className="text-lg font-bold text-white">${level.entryValue}</p>
                        <p className="text-xs text-gray-400">{level.currentQuotas}/{level.maxQuotas} cotas</p>
                        {!level.canAfford && (
                          <p className="text-xs text-red-400 mt-1">Saldo insuficiente</p>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedLevel && (
                    <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-3">Nível {selectedLevel} selecionado</h3>

                      <div className="flex items-center gap-4 mb-4">
                        <p className="text-gray-400">Quantidade:</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQuotaQuantity(Math.max(1, quotaQuantity - 1))}
                            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded text-white"
                          >
                            -
                          </button>
                          <span className="w-12 text-center text-white font-bold">{quotaQuantity}</span>
                          <button
                            onClick={() => {
                              const maxBuy = levelsAvailability.find(l => l.level === selectedLevel)?.maxCanBuy || 1
                              setQuotaQuantity(Math.min(maxBuy, quotaQuantity + 1))
                            }}
                            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="bg-black/30 rounded-lg p-3 mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">{quotaQuantity} cota(s) × ${LEVEL_CONFIG.ENTRY_VALUES[selectedLevel - 1]}</span>
                          <span className="text-white font-bold">${quotaQuantity * LEVEL_CONFIG.ENTRY_VALUES[selectedLevel - 1]}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Saldo após compra:</span>
                          <span className="text-emerald-400 font-bold">
                            ${((summary?.balance || 0) - quotaQuantity * LEVEL_CONFIG.ENTRY_VALUES[selectedLevel - 1]).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handlePurchaseQuota}
                        disabled={actionLoading}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 rounded-lg font-bold text-white transition-colors"
                      >
                        {actionLoading ? 'Processando...' : 'Confirmar Compra'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TRANSFERIR */}
              {activeTab === 'transfer' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-orbitron text-lg text-white">Transferir Saldo</h2>
                    <p className="text-gray-400 text-sm">Saldo: <span className="text-white font-bold">${summary?.balance.toFixed(2)}</span></p>
                  </div>

                  <div className="max-w-md space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Para quem?</label>
                      <input
                        type="text"
                        value={transferTo}
                        onChange={(e) => {
                          setTransferTo(e.target.value)
                          searchUser(e.target.value)
                        }}
                        placeholder="Código ou email do usuário"
                        className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500"
                      />
                      {transferUser && (
                        <div className="mt-2 p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                          <p className="text-green-400 text-sm">✅ {transferUser.name} ({transferUser.email})</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Valor</label>
                      <div className="flex gap-2 mb-2">
                        {[10, 50, 100].map(v => (
                          <button
                            key={v}
                            onClick={() => setTransferAmount(v.toString())}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition-colors"
                          >
                            ${v}
                          </button>
                        ))}
                        <button
                          onClick={() => setTransferAmount((summary?.balance || 0).toString())}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition-colors"
                        >
                          Máx
                        </button>
                      </div>
                      <input
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="0.00"
                        max={summary?.balance}
                        className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500"
                      />
                    </div>

                    {transferAmount && parseFloat(transferAmount) > 0 && (
                      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Enviar:</span>
                          <span className="text-white font-bold">${parseFloat(transferAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Seu saldo após:</span>
                          <span className="text-emerald-400 font-bold">
                            ${((summary?.balance || 0) - parseFloat(transferAmount)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleTransfer}
                      disabled={actionLoading || !transferTo || !transferAmount || parseFloat(transferAmount) > (summary?.balance || 0)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-bold text-white transition-colors"
                    >
                      {actionLoading ? 'Processando...' : 'Confirmar Transferência'}
                    </button>
                  </div>
                </div>
              )}

              {/* RECEBIMENTOS */}
              {activeTab === 'receipts' && (
                <div>
                  <h2 className="font-orbitron text-lg text-white mb-4">Meus Recebimentos</h2>

                  {/* Por Ciclos */}
                  <div className="mb-6">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                      <span>🔄</span> Recebimentos por Ciclos
                      <span className="text-emerald-400 font-bold">${receipts.cycles.reduce((sum, c) => sum + c.total, 0).toFixed(0)}</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-2 px-3 text-gray-400">Nível</th>
                            <th className="text-left py-2 px-3 text-gray-400">Ciclos</th>
                            <th className="text-left py-2 px-3 text-gray-400">Valor/Ciclo</th>
                            <th className="text-left py-2 px-3 text-gray-400">Total</th>
                            <th className="text-left py-2 px-3 text-gray-400">Último</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receipts.cycles.length === 0 ? (
                            <tr><td colSpan={5} className="py-4 text-center text-gray-500">Nenhum ciclo completado ainda</td></tr>
                          ) : receipts.cycles.map(c => (
                            <tr key={c.level} className="border-b border-white/5">
                              <td className="py-2 px-3 font-orbitron text-white">N{c.level}</td>
                              <td className="py-2 px-3 text-white">{c.cycles}</td>
                              <td className="py-2 px-3 text-gray-400">${c.valuePerCycle}</td>
                              <td className="py-2 px-3 text-emerald-400 font-bold">${c.total}</td>
                              <td className="py-2 px-3 text-gray-400">{formatTimeAgo(c.lastReceived)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Por Bônus */}
                  <div>
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                      <span>👥</span> Bônus de Indicação
                      <span className="text-purple-400 font-bold">${receipts.bonus.reduce((sum, b) => sum + b.amount, 0).toFixed(0)}</span>
                    </h3>
                    <div className="space-y-2">
                      {receipts.bonus.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Nenhum bônus recebido ainda</p>
                      ) : receipts.bonus.slice(0, 10).map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-white text-sm">{b.description || 'Bônus de indicação'}</p>
                            <p className="text-gray-500 text-xs">{formatDate(b.receivedAt)}</p>
                          </div>
                          <p className="text-purple-400 font-bold">+${b.amount.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* EXTRATO */}
              {activeTab === 'extract' && (
                <div>
                  <h2 className="font-orbitron text-lg text-white mb-4">Extrato Completo</h2>

                  <div className="space-y-2">
                    {transactions.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Nenhuma movimentação ainda</p>
                    ) : transactions.map(tx => (
                      <div
                        key={tx.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          tx.amount > 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{tx.icon}</span>
                          <div>
                            <p className="text-white text-sm font-medium">{tx.typeLabel}</p>
                            <p className="text-gray-500 text-xs">{tx.description}</p>
                            <p className="text-gray-600 text-xs">{formatDate(tx.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
                          </p>
                          <p className="text-gray-500 text-xs">Saldo: ${tx.balanceAfter.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </main>
    </div>
  )
}
