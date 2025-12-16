'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LEVEL_CONFIG } from '@/constants/levels'
import { ASSETS } from '@/constants/assets'

interface LevelData {
  levelNumber: number
  totalInQueue: number
  totalCycles: number
  cyclesToday: number
  entryValue: number
  rewardValue: number
  cashBalance: number
}

interface UserPosition {
  level: number
  position: number
  totalInQueue: number
  score: number
  quotaNumber: number
  enteredAt: string
  reentries: number
  cyclesCompleted: number
  totalEarned: number
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
  const [userPositions, setUserPositions] = useState<UserPosition[]>([])
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
        const positions: UserPosition[] = []

        for (let level = 1; level <= 10; level++) {
          const res = await fetch(`/api/matrix/position/${level}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const data = await res.json()
          if (data.position && data.position > 0) {
            positions.push({
              level,
              position: data.position,
              totalInQueue: data.totalInQueue,
              score: data.score || 0,
              quotaNumber: data.quotaNumber || 1,
              enteredAt: data.enteredAt,
              reentries: data.reentries || 0,
              // Dados reais de ciclos e ganhos vindos da API
              cyclesCompleted: data.cyclesCompleted || 0,
              totalEarned: data.totalEarned || 0
            })
          }
        }
        setUserPositions(positions)

        // Se usuário tem posições, seleciona o primeiro nível onde está
        if (positions.length > 0) {
          setSelectedLevel(positions[0].level)
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
  const getUserPositionInLevel = (level: number) => {
    return userPositions.find(p => p.level === level)
  }

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
            {/* SEÇÃO PRINCIPAL: Suas Posições */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-sm">
                  🎯
                </div>
                <div>
                  <h2 className="font-orbitron text-sm text-white">VOCÊ ESTÁ AQUI</h2>
                  <p className="text-gray-400 text-xs">
                    {userPositions.length > 0
                      ? `${userPositions.length} posição(ões) ativa(s) na matriz`
                      : 'Você ainda não tem posições. Compre uma cota!'
                    }
                  </p>
                </div>
              </div>

              {userPositions.length === 0 ? (
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
                  {userPositions.map((pos, idx) => {
                    const positionsUntil = getPositionsUntilCycle(pos.position)
                    const isAboutToCycle = pos.position <= 7
                    const progress = ((pos.totalInQueue - pos.position + 1) / pos.totalInQueue) * 100

                    return (
                      <div
                        key={`${pos.level}-${pos.quotaNumber}-${idx}`}
                        onClick={() => {
                          setSelectedLevel(pos.level)
                          setCurrentPage(1)
                        }}
                        className={`cursor-pointer rounded-lg p-2.5 transition-all transform hover:scale-[1.02] relative ${
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

                        {/* Header: Nível e Cota */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded flex items-center justify-center font-orbitron font-bold text-[10px] ${
                              isAboutToCycle ? 'bg-green-500' : 'bg-purple-600'
                            }`}>
                              N{pos.level}
                            </div>
                            <div>
                              <div className="text-white text-[10px] font-bold">Nível {pos.level}</div>
                              <div className="text-gray-400 text-[9px]">${LEVEL_CONFIG.ENTRY_VALUES[pos.level - 1]}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-400 text-[9px]">Cota</div>
                            <div className="text-white text-[10px] font-bold">#{pos.quotaNumber}</div>
                          </div>
                        </div>

                        {/* Posição Destacada */}
                        <div className="text-center py-1.5 bg-black/30 rounded mb-1.5">
                          <div className="text-gray-400 text-[9px]">Sua Posição</div>
                          <div className={`text-2xl font-bold font-orbitron ${
                            isAboutToCycle ? 'text-green-400' : 'text-white'
                          }`}>
                            #{pos.position}
                          </div>
                          <div className="text-gray-400 text-[9px]">de {pos.totalInQueue} na fila</div>
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

                        {/* Info de ciclo atual */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-1.5 mb-1.5 text-center">
                          <div className="text-[8px] text-blue-300">Ciclo Atual</div>
                          <div className="text-blue-400 font-bold text-sm">{pos.cyclesCompleted + 1}º ciclo</div>
                        </div>

                        {/* Ganhos separados */}
                        <div className="grid grid-cols-2 gap-1 mb-1.5">
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-1.5 text-center">
                            <div className="text-[8px] text-emerald-300">Já Recebeu</div>
                            <div className="text-emerald-400 font-bold text-xs">
                              ${Number(pos.totalEarned).toFixed(0)}
                            </div>
                            <div className="text-[7px] text-emerald-300/60">
                              {pos.cyclesCompleted > 0 ? `${pos.cyclesCompleted} ciclo${pos.cyclesCompleted > 1 ? 's' : ''}` : 'nenhum'}
                            </div>
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-1.5 text-center">
                            <div className="text-[8px] text-yellow-300">Vai Receber</div>
                            <div className="text-yellow-400 font-bold text-xs">
                              ${LEVEL_CONFIG.REWARD_VALUES[pos.level - 1]}
                            </div>
                            <div className="text-[7px] text-yellow-300/60">ao ciclar</div>
                          </div>
                        </div>

                        {/* Info de quanto falta */}
                        <div className={`text-center p-1 rounded text-[9px] ${
                          isAboutToCycle ? 'bg-green-500/20' : 'bg-white/5'
                        }`}>
                          {isAboutToCycle ? (
                            <span className="text-green-400 font-bold">
                              {pos.position === 1 ? '🔥 PRÓXIMO!' : `🔥 Faltam ${positionsUntil}`}
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              Faltam <span className="text-white font-bold">{positionsUntil}</span> posições
                            </span>
                          )}
                        </div>
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
                  const userPos = getUserPositionInLevel(level)
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
                          : userPos
                          ? 'bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/50 hover:border-green-400'
                          : 'bg-white/5 border border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-orbitron font-bold text-white text-[10px]">N{level}</span>
                        {userPos && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-green-500/30 text-green-400">
                            #{userPos.position}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-white">${LEVEL_CONFIG.ENTRY_VALUES[level - 1]}</div>
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
                    {totalInQueue} pessoas
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Caixa: ${Number(getLevelData(selectedLevel)?.cashBalance || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Indicador se usuário está nesta fila */}
              {getUserPositionInLevel(selectedLevel) && (
                <div className="mb-3 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-xs">
                    <span>⭐</span>
                    <span className="text-yellow-400 font-bold">Você está na posição #{getUserPositionInLevel(selectedLevel)?.position}</span>
                    <span className="text-gray-400">desta fila</span>
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
