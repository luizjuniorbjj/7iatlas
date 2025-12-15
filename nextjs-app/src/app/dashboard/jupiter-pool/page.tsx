'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface JupiterPoolData {
  balance: number
  totalDeposits: number
  totalWithdrawals: number
  todayDeposits: number
  todayWithdrawals: number
}

export default function JupiterPoolPage() {
  const router = useRouter()
  const [data, setData] = useState<JupiterPoolData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    fetch('/api/jupiter-pool/balance', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.data)
        }
      })
      .catch(() => {
        // Mock data se API falhar
        setData({
          balance: 15420.50,
          totalDeposits: 25000,
          totalWithdrawals: 9579.50,
          todayDeposits: 320,
          todayWithdrawals: 70
        })
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="font-orbitron text-4xl gradient-text animate-pulse">7iATLAS</div>
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
          <h1 className="font-orbitron text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">🪐</span>
            Jupiter Pool
          </h1>
          <p className="text-text-secondary">Fundo de Liquidez do Sistema</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          ← Voltar
        </Link>
      </div>

      {/* Main Balance Card */}
      <div className="glass-card p-8 mb-8 text-center">
        <div className="text-text-secondary mb-2">Saldo Total do Pool</div>
        <div className="font-orbitron text-5xl font-bold gradient-text mb-4">
          ${data?.balance.toLocaleString() || '0'}
        </div>
        <div className="flex justify-center gap-8 text-sm">
          <div>
            <span className="text-text-secondary">Hoje: </span>
            <span className="text-green-aurora">+${data?.todayDeposits || 0}</span>
          </div>
          <div>
            <span className="text-text-secondary">Injetado: </span>
            <span className="text-gold">-${data?.todayWithdrawals || 0}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Total Deposits */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-aurora/20 flex items-center justify-center text-2xl">
              📈
            </div>
            <div>
              <div className="text-text-secondary text-sm">Total Acumulado</div>
              <div className="font-orbitron text-2xl font-bold text-green-aurora">
                ${data?.totalDeposits.toLocaleString() || '0'}
              </div>
            </div>
          </div>
          <div className="text-xs text-text-secondary">
            10% de cada ciclo completado vai para o Jupiter Pool
          </div>
        </div>

        {/* Total Withdrawals */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center text-2xl">
              💫
            </div>
            <div>
              <div className="text-text-secondary text-sm">Total Injetado</div>
              <div className="font-orbitron text-2xl font-bold text-gold">
                ${data?.totalWithdrawals.toLocaleString() || '0'}
              </div>
            </div>
          </div>
          <div className="text-xs text-text-secondary">
            Injetado nos níveis quando o caixa está baixo
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="glass-card p-6">
        <h2 className="font-orbitron text-lg mb-6">Como Funciona o Jupiter Pool</h2>

        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gradient-start to-gradient-end flex items-center justify-center text-3xl mx-auto mb-4">
              1
            </div>
            <h3 className="font-medium mb-2">Coleta</h3>
            <p className="text-sm text-text-secondary">
              10% de cada ciclo completado (posição 0 - recebedor) vai para o Jupiter Pool automaticamente.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gradient-start to-gradient-end flex items-center justify-center text-3xl mx-auto mb-4">
              2
            </div>
            <h3 className="font-medium mb-2">Acumulação</h3>
            <p className="text-sm text-text-secondary">
              O pool acumula fundos continuamente conforme os ciclos são processados em todos os níveis.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gradient-start to-gradient-end flex items-center justify-center text-3xl mx-auto mb-4">
              3
            </div>
            <h3 className="font-medium mb-2">Injeção</h3>
            <p className="text-sm text-text-secondary">
              Quando um nível precisa de liquidez para completar ciclos, o Jupiter Pool injeta fundos automaticamente.
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gradient-to-r from-gradient-start/10 to-gradient-end/10 rounded-xl border border-gradient-mid/30">
          <h3 className="font-medium mb-2">🔒 Sistema Anti-Travamento</h3>
          <p className="text-sm text-text-secondary">
            O Jupiter Pool garante que o sistema nunca trave por falta de liquidez.
            Quando um nível não tem fundos suficientes para pagar um ciclo, o pool
            automaticamente injeta o valor necessário, mantendo o fluxo contínuo de pagamentos.
          </p>
        </div>

        <div className="mt-4 p-4 bg-white/5 rounded-xl">
          <h3 className="font-medium mb-2">📊 Distribuição da Posição 5</h3>
          <div className="grid grid-cols-4 gap-4 text-center text-sm">
            <div>
              <div className="text-green-aurora font-bold">10%</div>
              <div className="text-text-secondary">Reserva</div>
            </div>
            <div>
              <div className="text-cyan font-bold">10%</div>
              <div className="text-text-secondary">Operacional</div>
            </div>
            <div>
              <div className="text-gold font-bold">40%</div>
              <div className="text-text-secondary">Bônus Indicador</div>
            </div>
            <div>
              <div className="text-pink-star font-bold">40%</div>
              <div className="text-text-secondary">Lucro Sistema</div>
            </div>
          </div>
          <div className="text-center mt-4 text-xs text-text-secondary">
            + 10% do valor do recebedor (posição 0) vai para o Jupiter Pool
          </div>
        </div>
      </div>
    </div>
  )
}
