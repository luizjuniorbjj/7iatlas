'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LEVEL_CONFIG } from '@/constants/levels'
import { ASSETS } from '@/constants/assets'
import { formatCurrency, formatNumber } from '@/utils/format'

interface LevelData {
  levelNumber: number
  totalInQueue: number
  totalCycles: number
  cyclesToday: number
  entryValue: number
  rewardValue: number
  cashBalance: number
}

interface QuotaPosition {
  position: number
  totalInQueue: number
  score: number
  quotaNumber: number
  enteredAt: string
  reentries: number
  cyclesCompleted: number
  totalEarned: number
  percentile: number
  estimatedWait: string
}

interface LevelGroupedData {
  level: number
  totalQuotas: number
  quotas: QuotaPosition[]
  bestPosition: number
  worstPosition: number
  totalCycles: number
  totalEarned: number
  totalInQueue: number
}

interface QueueItem {
  position: number
  userId: string
  name: string
  code: string
  score: number
  timeInQueue: string
  reentries: number
  isCurrentUser: boolean
}

export default function MatrixPage() {
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [levelsData, setLevelsData] = useState<LevelData[]>([])
  const [groupedPositions, setGroupedPositions] = useState<LevelGroupedData[]>([])
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set())
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [queueLoading, setQueueLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalInQueue, setTotalInQueue] = useState(0)

  // Buscar dados dos níveis
  useEffect(() => {
    const fetchLevelsData = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        const res = await fetch('/api/matrix/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.levels) {
          setLevelsData(data.levels)
        }
      } catch (error) {
        console.error('Erro ao buscar níveis:', error)
      }
    }

    const fetchUserPositions = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        const grouped: LevelGroupedData[] = []

        for (let level = 1; level <= 10; level++) {
          const res = await fetch(`/api/matrix/position/${level}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const data = await res.json()

          // API retorna allQuotas com todas as cotas do nível
          if (data.hasPosition && data.allQuotas && data.allQuotas.length > 0) {
            const quotas: QuotaPosition[] = data.allQuotas.map((q: any) => ({
              position: q.position,
              totalInQueue: q.totalInQueue,
              score: q.score || 0,
              quotaNumber: q.quotaNumber || 1,
              enteredAt: q.enteredAt,
              reentries: q.reentries || 0,
              cyclesCompleted: q.cyclesCompleted || 0,
              totalEarned: q.totalEarned || 0,
              percentile: q.percentile || 0,
              estimatedWait: q.estimatedWait || ''
            }))

            // Ordena por posição (melhor primeiro)
            quotas.sort((a, b) => a.position - b.position)

            grouped.push({
              level,
              totalQuotas: quotas.length,
              quotas,
              bestPosition: Math.min(...quotas.map(q => q.position)),
              worstPosition: Math.max(...quotas.map(q => q.position)),
              totalCycles: quotas.reduce((sum, q) => sum + q.cyclesCompleted, 0),
              totalEarned: quotas.reduce((sum, q) => sum + q.totalEarned, 0),
              totalInQueue: data.totalInQueue
            })
          }
        }
        setGroupedPositions(grouped)

        // Se usuário tem posições, seleciona o primeiro nível onde está
        if (grouped.length > 0) {
          setSelectedLevel(grouped[0].level)
        }
      } catch (error) {
        console.error('Erro ao buscar posições:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLevelsData()
    fetchUserPositions()
  }, [])

  // Buscar fila do nível selecionado
  useEffect(() => {
    const fetchQueue = async () => {
      setQueueLoading(true)
      try {
        const token = localStorage.getItem('accessToken')
        const res = await fetch(`/api/matrix/queue/${selectedLevel}?page=${currentPage}&limit=10&highlight=true`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()

        if (data.items) {
          setQueueItems(data.items)
          setTotalPages(data.pagination?.totalPages || 1)
          setTotalInQueue(data.pagination?.total || 0)
        }
      } catch (error) {
        console.error('Erro ao buscar fila:', error)
      } finally {
        setQueueLoading(false)
      }
    }

    fetchQueue()
  }, [selectedLevel, currentPage])

  // Verificar se usuário tem posição no nível
  const getLevelGroupData = (level: number) => {
    return groupedPositions.find(p => p.level === level)
  }

  // Toggle expandir/colapsar nível
  const toggleLevelExpanded = (level: number) => {
    setExpandedLevels(prev => {
      const newSet = new Set(prev)
      if (newSet.has(level)) {
        newSet.delete(level)
      } else {
        newSet.add(level)
      }
      return newSet
    })
  }

  // Contar total de cotas do usuário
  const totalUserQuotas = groupedPositions.reduce((sum, g) => sum + g.totalQuotas, 0)

  // Obter dados do nível
  const getLevelData = (level: number) => {
    return levelsData.find(l => l.levelNumber === level)
  }

  // Calcular posições até ciclar
  const getPositionsUntilCycle = (position: number) => {
    return Math.max(0, position - 1)
  }

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
          <Link href="/dashboard/matrix" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-purple-500/30">
            <span>📊</span>
            <span>Matriz</span>
          </Link>
          <Link href="/dashboard/transfers" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
            <span>💸</span>
            <span>Transferências</span>
          </Link>
          <Link href="/dashboard/referrals" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
            <span>👥</span>
            <span>Indicados</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-[#0a0a0f]">
        <div className="mb-5">
          <h1 className="font-orbitron text-2xl font-bold text-white mb-1">Minha Posição na Matriz</h1>
          <p className="text-gray-400 text-sm">
            Veja onde você está em cada nível e acompanhe seu progresso
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            {/* SEÇÃO PRINCIPAL: Suas Posições Agrupadas por Nível */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-sm">
                  🎯
                </div>
                <div>
                  <h2 className="font-orbitron text-sm text-white">VOCÊ ESTÁ AQUI</h2>
                  <p className="text-gray-400 text-xs">
                    {groupedPositions.length > 0
                      ? `${totalUserQuotas} cota${totalUserQuotas > 1 ? 's' : ''} em ${groupedPositions.length} nível(is)`
                      : 'Você ainda não tem posições. Compre uma cota!'
                    }
                  </p>
                </div>
              </div>

              {groupedPositions.length === 0 ? (
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-3">🚀</div>
                  <h3 className="font-orbitron text-lg text-white mb-2">Entre na Matriz!</h3>
                  <p className="text-gray-400 text-sm mb-3">Compre sua primeira cota e comece a ganhar</p>
                  <Link href="/dashboard/quotas" className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold text-white text-sm hover:opacity-90 transition-opacity">
                    Comprar Cota
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {groupedPositions.map((group) => {
                    const bestQuota = group.quotas[0] // Primeira é a melhor posição
                    const isAboutToCycle = bestQuota.position <= 7
                    const progress = ((group.totalInQueue - bestQuota.position + 1) / group.totalInQueue) * 100
                    const positionsUntil = getPositionsUntilCycle(bestQuota.position)
                    const isExpanded = expandedLevels.has(group.level)

                    return (
                      <div
                        key={`level-${group.level}`}
                        className={`rounded-lg p-2.5 transition-all relative ${
                          isAboutToCycle
                            ? 'bg-gradient-to-br from-green-600/40 to-emerald-600/40 border border-green-400 shadow-md shadow-green-500/20'
                            : 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30'
                        }`}
                      >
                        {/* Badge de status */}
                        {isAboutToCycle && (
                          <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-green-500 rounded-full text-[9px] font-bold text-white animate-pulse">
                            PRÓXIMO!
                          </div>
                        )}

                        {/* Header: Nível e Total de Cotas */}
                        <div
                          className="flex items-center justify-between mb-1.5 cursor-pointer"
                          onClick={() => {
                            setSelectedLevel(group.level)
                            setCurrentPage(1)
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded flex items-center justify-center font-orbitron font-bold text-[10px] ${
                              isAboutToCycle ? 'bg-green-500' : 'bg-purple-600'
                            }`}>
                              N{group.level}
                            </div>
                            <div>
                              <div className="text-white text-[10px] font-bold">Nível {group.level}</div>
                              <div className="text-gray-400 text-[9px]">{formatCurrency(LEVEL_CONFIG.ENTRY_VALUES[group.level - 1], 0)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-400 text-[9px]">Cotas</div>
                            <div className="text-white text-[10px] font-bold">{group.totalQuotas}x</div>
                          </div>
                        </div>

                        {/* Melhor Posição Destacada */}
                        <div
                          className="text-center py-1.5 bg-black/30 rounded mb-1.5 cursor-pointer"
                          onClick={() => {
                            setSelectedLevel(group.level)
                            setCurrentPage(1)
                          }}
                        >
                          <div className="text-gray-400 text-[9px]">Melhor Posição</div>
                          <div className={`text-2xl font-bold font-orbitron ${
                            isAboutToCycle ? 'text-green-400' : 'text-white'
                          }`}>
                            #{bestQuota.position}
                          </div>
                          <div className="text-gray-400 text-[9px]">de {formatNumber(group.totalInQueue)} na fila</div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="mb-1.5">
                          <div className="h-1 bg-black/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isAboutToCycle
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Totais do Nível */}
                        <div className="grid grid-cols-2 gap-1 mb-1.5">
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-1.5 text-center">
                            <div className="text-[8px] text-emerald-300">Total Recebido</div>
                            <div className="text-emerald-400 font-bold text-xs">
                              {formatCurrency(group.totalEarned, 0)}
                            </div>
                            <div className="text-[7px] text-emerald-300/60">
                              {group.totalCycles > 0 ? `${group.totalCycles} ciclo${group.totalCycles > 1 ? 's' : ''}` : 'nenhum'}
                            </div>
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-1.5 text-center">
                            <div className="text-[8px] text-yellow-300">Próximo</div>
                            <div className="text-yellow-400 font-bold text-xs">
                              {formatCurrency(LEVEL_CONFIG.REWARD_VALUES[group.level - 1], 0)}
                            </div>
                            <div className="text-[7px] text-yellow-300/60">por cota</div>
                          </div>
                        </div>

                        {/* Info de quanto falta */}
                        <div className={`text-center p-1 rounded text-[9px] ${
                          isAboutToCycle ? 'bg-green-500/20' : 'bg-white/5'
                        }`}>
                          {isAboutToCycle ? (
                            <span className="text-green-400 font-bold">
                              {bestQuota.position === 1 ? '🔥 PRÓXIMO!' : `🔥 Faltam ${positionsUntil}`}
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              Faltam <span className="text-white font-bold">{positionsUntil}</span> posições
                            </span>
                          )}
                        </div>

                        {/* Botão para expandir detalhes das cotas */}
                        {group.totalQuotas > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleLevelExpanded(group.level)
                            }}
                            className="w-full mt-1.5 py-1 text-[9px] text-purple-400 hover:text-purple-300 bg-purple-500/10 rounded transition-colors"
                          >
                            {isExpanded ? '▲ Ocultar cotas' : `▼ Ver ${group.totalQuotas} cotas`}
                          </button>
                        )}

                        {/* Lista expandida de cotas */}
                        {isExpanded && group.totalQuotas > 1 && (
                          <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                            {group.quotas.map((quota, idx) => {
                              const quotaIsAboutToCycle = quota.position <= 7
                              return (
                                <div
                                  key={`quota-${group.level}-${quota.quotaNumber}-${idx}`}
                                  className={`p-1.5 rounded text-[9px] ${
                                    quotaIsAboutToCycle
                                      ? 'bg-green-500/20 border border-green-500/30'
                                      : 'bg-white/5 border border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Cota #{quota.quotaNumber}</span>
                                    <span className={`font-bold ${quotaIsAboutToCycle ? 'text-green-400' : 'text-white'}`}>
                                      Pos #{quota.position}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-gray-500">Ciclos: {quota.cyclesCompleted}</span>
                                    <span className="text-emerald-400">+{formatCurrency(quota.totalEarned, 0)}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Grid de Todos os Níveis */}
            <div className="mb-5">
              <h2 className="font-orbitron text-xs mb-2 text-gray-400">Visão Geral dos Níveis</h2>
              <div className="grid grid-cols-5 lg:grid-cols-10 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
                  const levelData = getLevelData(level)
                  const groupData = getLevelGroupData(level)
                  const isSelected = selectedLevel === level

                  return (
                    <button
                      key={level}
                      onClick={() => {
                        setSelectedLevel(level)
                        setCurrentPage(1)
                      }}
                      className={`p-1.5 rounded text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 ring-2 ring-purple-400'
                          : groupData
                          ? 'bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/50 hover:border-green-400'
                          : 'bg-white/5 border border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-orbitron font-bold text-white text-[10px]">N{level}</span>
                        {groupData && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-green-500/30 text-green-400">
                            {groupData.totalQuotas > 1 ? `${groupData.totalQuotas}x` : `#${groupData.bestPosition}`}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-white">{formatCurrency(LEVEL_CONFIG.ENTRY_VALUES[level - 1], 0)}</div>
                      <div className="text-[9px] text-gray-400">
                        {levelData?.totalInQueue || 0} fila
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fila do Nível Selecionado */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-orbitron text-sm text-white">
                  Fila do Nível {selectedLevel}
                </h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-400">
                    {formatNumber(totalInQueue)} pessoas
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Caixa: {formatCurrency(getLevelData(selectedLevel)?.cashBalance || 0)}
                  </span>
                </div>
              </div>

              {/* Indicador se usuário está nesta fila */}
              {getLevelGroupData(selectedLevel) && (
                <div className="mb-3 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-xs">
                    <span>⭐</span>
                    {getLevelGroupData(selectedLevel)!.totalQuotas > 1 ? (
                      <>
                        <span className="text-yellow-400 font-bold">
                          Você tem {getLevelGroupData(selectedLevel)!.totalQuotas} cotas neste nível
                        </span>
                        <span className="text-gray-400">
                          (posições: {getLevelGroupData(selectedLevel)!.quotas.map(q => `#${q.position}`).join(', ')})
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-yellow-400 font-bold">Você está na posição #{getLevelGroupData(selectedLevel)!.bestPosition}</span>
                        <span className="text-gray-400">desta fila</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {queueLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : queueItems.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-xs">Nenhuma pessoa na fila</p>
                </div>
              ) : (
                <>
                  {/* Tabela da Fila */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Pos</th>
                          <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Usuário</th>
                          <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Tempo</th>
                          <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Reent.</th>
                          <th className="text-right py-1.5 px-2 text-gray-400 font-medium">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queueItems.map((item, idx) => {
                          const isTop7 = item.position <= 7
                          const isCurrentUser = item.isCurrentUser

                          return (
                            <tr
                              key={`${item.userId}-${idx}`}
                              className={`border-b border-white/5 transition-colors ${
                                isCurrentUser
                                  ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-l-2 border-l-yellow-500'
                                  : isTop7
                                  ? 'bg-green-500/10'
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <td className="py-1.5 px-2">
                                <div className="flex items-center gap-1">
                                  <span className={`font-orbitron font-bold ${
                                    isCurrentUser ? 'text-yellow-400' : isTop7 ? 'text-green-400' : 'text-white'
                                  }`}>
                                    #{item.position}
                                  </span>
                                  {isTop7 && <span className="text-[10px]">🔥</span>}
                                </div>
                              </td>
                              <td className="py-1.5 px-2">
                                <div className="flex items-center gap-1">
                                  {isCurrentUser && (
                                    <span className="px-1 py-0.5 bg-yellow-500 rounded text-[8px] font-bold text-black">
                                      VOCÊ
                                    </span>
                                  )}
                                  <span className={isCurrentUser ? 'text-yellow-400 font-bold' : 'text-white'}>
                                    {item.name || 'Anônimo'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-gray-400">
                                {item.timeInQueue}
                              </td>
                              <td className="py-1.5 px-2 text-gray-400">
                                {item.reentries}x
                              </td>
                              <td className="py-1.5 px-2 text-right">
                                <span className="text-purple-400 font-mono">
                                  {Number(item.score).toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 rounded bg-white/10 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                      >
                        ◀
                      </button>
                      <span className="text-gray-400 text-xs px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 rounded bg-white/10 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                      >
                        ▶
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Legenda */}
              <div className="mt-3 pt-2 border-t border-white/10">
                <div className="flex flex-wrap gap-4 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-yellow-500"></div>
                    <span className="text-gray-400">Você</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-green-500/30 border border-green-500"></div>
                    <span className="text-gray-400">Top 7</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>🔥</span>
                    <span className="text-gray-400">Próximo</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
