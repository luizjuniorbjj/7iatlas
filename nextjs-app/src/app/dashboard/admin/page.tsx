'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ASSETS } from '@/constants/assets'
import { formatCurrency, formatNumber } from '@/utils/format'

interface FinanceiroData {
  resumo: {
    totalEntradas: number
    totalSaidas: number
    totalCashBalance: number
    totalSaldoUsuarios: number
    totalUsuarios: number
    totalQuotasInQueue: number
    totalCotasVendidas: number
    totalCiclos: number
  }
  receitaEmpresa: {
    posicao5Total: number
    reserva: { valor: number; percentual: number; descricao: string }
    operacional: { valor: number; percentual: number; descricao: string }
    lucroGarantido: { valor: number; percentual: number; descricao: string }
    bonusPago: { valor: number; quantidade: number; descricao: string }
    bonusNaoPago: { valor: number; descricao: string }
    pos24Nivel10: { valor: number; ciclos: number; descricao: string }
    receitaTotal: { valor: number; descricao: string }
  }
  jupiterPool: {
    valor: number
    percentual: number
    descricao: string
    ciclos: number
  }
  entradas: {
    vendaCotas: { total: number; quantidade: number }
  }
  saidas: {
    recompensas: { total: number; quantidade: number; descricao: string }
    bonus: { total: number; quantidade: number; descricao: string }
    saques: { total: number; quantidade: number }
  }
  niveis: Array<{
    level: number
    entryValue: number
    rewardValue: number
    cashBalance: number
    totalUsers: number
    cotasVendidas: number
    vendasNivel: number
  }>
  ciclos: Array<{
    nivel: number
    totalCiclos: number
    ciclosHoje: number
    mediaDiaria: number
  }>
}

export default function AdminPage() {
  const router = useRouter()
  const [data, setData] = useState<FinanceiroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken')

        if (!token) {
          router.push('/auth/login')
          return
        }

        const res = await fetch('/api/admin/financeiro', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.status === 401) {
          // Token expirado, redireciona para login
          localStorage.removeItem('accessToken')
          router.push('/auth/login')
          return
        }

        if (!res.ok) {
          throw new Error('Erro ao carregar dados')
        }

        const json = await res.json()
        setData(json)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando dados financeiros...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>Erro: {error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const receitaTotal = data.receitaEmpresa?.receitaTotal?.valor || 0
  const receitaColor = receitaTotal >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0d0d14] border-r border-white/10 p-6 flex flex-col">
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
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
            <span>🏠</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard/quotas" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
            <span>🎫</span>
            <span>Cotas</span>
          </Link>
          <Link href="/dashboard/matrix" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
            <span>📊</span>
            <span>Matriz</span>
          </Link>
          <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-red-500/20 to-orange-500/20 text-white border border-orange-500/30">
            <span>🔐</span>
            <span>Admin</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-[#0a0a0f] overflow-auto">
        <div className="mb-6">
          <h1 className="font-orbitron text-2xl font-bold text-white mb-1">Painel Administrativo</h1>
          <p className="text-gray-400 text-sm">Visao geral financeira do sistema 7iATLAS</p>
        </div>

        {/* Cards Resumo Principal */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 border border-emerald-500/30 rounded-xl p-4">
            <div className="text-emerald-300 text-xs mb-1">Total Entradas</div>
            <div className="text-emerald-400 font-bold text-xl font-orbitron">
              {formatCurrency(data.resumo.totalEntradas)}
            </div>
            <div className="text-emerald-300/60 text-xs mt-1">{formatNumber(data.resumo.totalCotasVendidas)} cotas</div>
          </div>

          <div className="bg-gradient-to-br from-red-900/40 to-pink-900/40 border border-red-500/30 rounded-xl p-4">
            <div className="text-red-300 text-xs mb-1">Total Saidas</div>
            <div className="text-red-400 font-bold text-xl font-orbitron">
              {formatCurrency(data.resumo.totalSaidas)}
            </div>
            <div className="text-red-300/60 text-xs mt-1">{formatNumber(data.resumo.totalCiclos)} ciclos</div>
          </div>

          <div className={`bg-gradient-to-br ${receitaTotal >= 0 ? 'from-blue-900/40 to-purple-900/40 border-blue-500/30' : 'from-red-900/40 to-orange-900/40 border-red-500/30'} border rounded-xl p-4`}>
            <div className="text-blue-300 text-xs mb-1">Receita Total Empresa</div>
            <div className={`font-bold text-xl font-orbitron ${receitaColor}`}>
              {formatCurrency(receitaTotal)}
            </div>
            <div className="text-blue-300/60 text-xs mt-1">10%+10%+40% + bonus nao pago</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border border-yellow-500/30 rounded-xl p-4">
            <div className="text-yellow-300 text-xs mb-1">Caixa Total</div>
            <div className="text-yellow-400 font-bold text-xl font-orbitron">
              {formatCurrency(data.resumo.totalCashBalance)}
            </div>
            <div className="text-yellow-300/60 text-xs mt-1">Retido nos niveis</div>
          </div>
        </div>

        {/* Receita da Empresa (Posição 5) */}
        {data.receitaEmpresa && (
          <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-xl p-4 mb-6">
            <h2 className="font-orbitron text-lg text-purple-400 mb-4 flex items-center gap-2">
              <span>💰</span> Receita da Empresa (Posicao 5)
            </h2>
            <p className="text-purple-300/60 text-xs mb-4">
              A cada ciclo, a posicao 5 paga o valor da cota. Total arrecadado: {formatCurrency(data.receitaEmpresa.posicao5Total)}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Reserva 10% */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                <div className="text-cyan-300 text-xs mb-1">🛡️ Reserva (10%)</div>
                <div className="text-cyan-400 font-bold text-lg font-orbitron">
                  {formatCurrency(data.receitaEmpresa.reserva.valor)}
                </div>
                <div className="text-cyan-300/60 text-xs">{data.receitaEmpresa.reserva.descricao}</div>
              </div>

              {/* Operacional 10% */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                <div className="text-orange-300 text-xs mb-1">🏢 Operacional (10%)</div>
                <div className="text-orange-400 font-bold text-lg font-orbitron">
                  {formatCurrency(data.receitaEmpresa.operacional.valor)}
                </div>
                <div className="text-orange-300/60 text-xs">{data.receitaEmpresa.operacional.descricao}</div>
              </div>

              {/* Lucro Garantido 40% */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <div className="text-emerald-300 text-xs mb-1">✅ Lucro Garantido (40%)</div>
                <div className="text-emerald-400 font-bold text-lg font-orbitron">
                  {formatCurrency(data.receitaEmpresa.lucroGarantido.valor)}
                </div>
                <div className="text-emerald-300/60 text-xs">{data.receitaEmpresa.lucroGarantido.descricao}</div>
              </div>

              {/* Receita Total */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-3">
                <div className="text-green-300 text-xs mb-1">💎 RECEITA TOTAL</div>
                <div className="text-green-400 font-bold text-lg font-orbitron">
                  {formatCurrency(data.receitaEmpresa.receitaTotal.valor)}
                </div>
                <div className="text-green-300/60 text-xs">{data.receitaEmpresa.receitaTotal.descricao}</div>
              </div>
            </div>

            {/* Bônus e Posições 2/4 Nível 10 */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3">
                <div className="text-pink-300 text-xs mb-1">🎁 Bonus Pago ({formatNumber(data.receitaEmpresa.bonusPago.quantidade)})</div>
                <div className="text-pink-400 font-bold text-lg font-orbitron">
                  {formatCurrency(data.receitaEmpresa.bonusPago.valor)}
                </div>
                <div className="text-pink-300/60 text-xs">{data.receitaEmpresa.bonusPago.descricao}</div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="text-yellow-300 text-xs mb-1">➕ Bonus Nao Pago</div>
                <div className="text-yellow-400 font-bold text-lg font-orbitron">
                  {formatCurrency(data.receitaEmpresa.bonusNaoPago.valor)}
                </div>
                <div className="text-yellow-300/60 text-xs">{data.receitaEmpresa.bonusNaoPago.descricao}</div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="text-red-300 text-xs mb-1">🔟 Pos 2/4 Nivel 10 ({formatNumber(data.receitaEmpresa.pos24Nivel10?.ciclos || 0)} ciclos)</div>
                <div className="text-red-400 font-bold text-lg font-orbitron">
                  {formatCurrency(data.receitaEmpresa.pos24Nivel10?.valor || 0)}
                </div>
                <div className="text-red-300/60 text-xs">{data.receitaEmpresa.pos24Nivel10?.descricao || 'Sem avanco = lucro'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Jupiter Pool (SEPARADO) */}
        {data.jupiterPool && (
          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-xl p-4 mb-6">
            <h2 className="font-orbitron text-lg text-blue-400 mb-4 flex items-center gap-2">
              <span>🪐</span> Jupiter Pool (Reserva Anti-Travamento)
            </h2>
            <p className="text-blue-300/60 text-xs mb-4">
              10% do ganho do RECEBEDOR vai para esta reserva de seguranca. Usado para destravar niveis parados.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="text-blue-300 text-xs mb-1">🪐 Saldo Jupiter Pool</div>
                <div className="text-blue-400 font-bold text-xl font-orbitron">
                  {formatCurrency(data.jupiterPool.valor)}
                </div>
                <div className="text-blue-300/60 text-xs">{data.jupiterPool.descricao}</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="text-blue-300 text-xs mb-1">📊 Ciclos Contribuintes</div>
                <div className="text-blue-400 font-bold text-xl font-orbitron">
                  {formatNumber(data.jupiterPool.ciclos)}
                </div>
                <div className="text-blue-300/60 text-xs">Total de ciclos que contribuiram</div>
              </div>
            </div>
          </div>
        )}

        {/* Segunda linha de cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">Total Usuarios</div>
            <div className="text-white font-bold text-2xl font-orbitron">
              {formatNumber(data.resumo.totalUsuarios)}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">Cotas na Fila</div>
            <div className="text-white font-bold text-2xl font-orbitron">
              {formatNumber(data.resumo.totalQuotasInQueue)}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">Saldo Usuarios</div>
            <div className="text-purple-400 font-bold text-2xl font-orbitron">
              {formatCurrency(data.resumo.totalSaldoUsuarios)}
            </div>
          </div>
        </div>

        {/* Detalhes Entradas e Saídas */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Entradas */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="font-orbitron text-lg text-emerald-400 mb-4 flex items-center gap-2">
              <span>📥</span> Entradas
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg">
                <div>
                  <div className="text-white font-medium">Venda de Cotas</div>
                  <div className="text-gray-400 text-xs">{formatNumber(data.entradas.vendaCotas.quantidade)} cotas vendidas</div>
                </div>
                <div className="text-emerald-400 font-bold">{formatCurrency(data.entradas.vendaCotas.total)}</div>
              </div>
            </div>
          </div>

          {/* Saídas */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="font-orbitron text-lg text-red-400 mb-4 flex items-center gap-2">
              <span>📤</span> Saidas
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg">
                <div>
                  <div className="text-white font-medium">Recompensas Ciclos</div>
                  <div className="text-gray-400 text-xs">{formatNumber(data.saidas.recompensas.quantidade)} ciclos</div>
                </div>
                <div className="text-red-400 font-bold">{formatCurrency(data.saidas.recompensas.total)}</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg">
                <div>
                  <div className="text-white font-medium">Bonus Indicacao</div>
                  <div className="text-gray-400 text-xs">{formatNumber(data.saidas.bonus.quantidade)} bonus</div>
                </div>
                <div className="text-red-400 font-bold">{formatCurrency(data.saidas.bonus.total)}</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg">
                <div>
                  <div className="text-white font-medium">Saques</div>
                  <div className="text-gray-400 text-xs">{formatNumber(data.saidas.saques.quantidade)} saques</div>
                </div>
                <div className="text-red-400 font-bold">{formatCurrency(data.saidas.saques.total)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Níveis */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <h2 className="font-orbitron text-lg text-white mb-4 flex items-center gap-2">
            <span>📊</span> Vendas e Caixa por Nivel
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-gray-400">Nivel</th>
                  <th className="text-right py-2 px-3 text-gray-400">Entrada</th>
                  <th className="text-right py-2 px-3 text-gray-400">Cotas</th>
                  <th className="text-right py-2 px-3 text-gray-400">Vendas</th>
                  <th className="text-right py-2 px-3 text-gray-400">Caixa</th>
                </tr>
              </thead>
              <tbody>
                {data.niveis.map((nivel) => (
                  <tr key={nivel.level} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3">
                      <span className="font-orbitron text-purple-400">N{nivel.level}</span>
                    </td>
                    <td className="py-2 px-3 text-right text-white">{formatCurrency(nivel.entryValue)}</td>
                    <td className="py-2 px-3 text-right text-cyan-400">{formatNumber(nivel.cotasVendidas)}</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">{formatCurrency(nivel.vendasNivel)}</td>
                    <td className="py-2 px-3 text-right text-yellow-400">{formatCurrency(nivel.cashBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/5">
                  <td className="py-2 px-3 font-bold text-white" colSpan={2}>TOTAL</td>
                  <td className="py-2 px-3 text-right text-cyan-400 font-bold">{formatNumber(data.resumo.totalCotasVendidas)}</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">{formatCurrency(data.resumo.totalEntradas)}</td>
                  <td className="py-2 px-3 text-right text-yellow-400 font-bold">{formatCurrency(data.resumo.totalCashBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Estatísticas de Ciclos */}
        {data.ciclos.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="font-orbitron text-lg text-white mb-4 flex items-center gap-2">
              <span>🔄</span> Estatisticas de Ciclos
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {data.ciclos.map((ciclo) => (
                <div key={ciclo.nivel} className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                  <div className="font-orbitron text-purple-400 text-sm mb-1">N{ciclo.nivel}</div>
                  <div className="text-white font-bold text-lg">{formatNumber(ciclo.totalCiclos)}</div>
                  <div className="text-gray-400 text-xs">ciclos</div>
                  <div className="text-emerald-400 text-xs mt-1">+{ciclo.ciclosHoje} hoje</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumo do Balanço */}
        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📈</span>
            <div className="flex-1">
              <h3 className="text-purple-400 font-bold mb-3">Balanco do Sistema</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-purple-300/70 mb-2">
                    <strong className="text-emerald-400">ENTRADAS:</strong><br/>
                    • Vendas de cotas: {formatCurrency(data.resumo.totalEntradas)}<br/>
                    • Quantidade: {formatNumber(data.resumo.totalCotasVendidas)} cotas
                  </p>
                  <p className="text-purple-300/70 mb-2">
                    <strong className="text-red-400">SAIDAS (para usuarios):</strong><br/>
                    • Recompensas: {formatCurrency(data.saidas.recompensas.total)}<br/>
                    • Bonus indicacao: {formatCurrency(data.saidas.bonus.total)}<br/>
                    • Total ciclos: {formatNumber(data.resumo.totalCiclos)}
                  </p>
                </div>
                <div>
                  {data.receitaEmpresa && (
                    <p className="text-purple-300/70 mb-2">
                      <strong className="text-green-400">RECEITA EMPRESA:</strong><br/>
                      • Reserva (10%): {formatCurrency(data.receitaEmpresa.reserva.valor)}<br/>
                      • Operacional (10%): {formatCurrency(data.receitaEmpresa.operacional.valor)}<br/>
                      • Lucro garantido (40%): {formatCurrency(data.receitaEmpresa.lucroGarantido.valor)}<br/>
                      • Bonus nao pago: {formatCurrency(data.receitaEmpresa.bonusNaoPago.valor)}<br/>
                      • Pos 2/4 N10: {formatCurrency(data.receitaEmpresa.pos24Nivel10?.valor || 0)}<br/>
                      • <span className="text-green-400 font-bold">RECEITA TOTAL: {formatCurrency(data.receitaEmpresa.receitaTotal.valor)}</span>
                    </p>
                  )}
                  {data.jupiterPool && (
                    <p className="text-purple-300/70 mb-2">
                      <strong className="text-blue-400">JUPITER POOL (SEPARADO):</strong><br/>
                      • Saldo: {formatCurrency(data.jupiterPool.valor)}<br/>
                      • 10% do ganho do recebedor
                    </p>
                  )}
                  <p className="text-purple-300/70">
                    <strong className="text-yellow-400">SALDOS:</strong><br/>
                    • Caixa nos niveis: {formatCurrency(data.resumo.totalCashBalance)}<br/>
                    • Saldo usuarios: {formatCurrency(data.resumo.totalSaldoUsuarios)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
