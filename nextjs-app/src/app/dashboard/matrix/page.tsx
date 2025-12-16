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
              enteredAt: data.enteredAt
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
    return Math.max(0, position - 1) // Posição 1 cicla próximo
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
      <main className="flex-1 p-8 bg-[#0a0a0f]">
        <div className="mb-8">
          <h1 className="font-orbitron text-3xl font-bold text-white mb-2">Minha Posição na Matriz</h1>
          <p className="text-gray-400">
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
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-xl">
                  🎯
                </div>
                <div>
                  <h2 className="font-orbitron text-xl text-white">VOCÊ ESTÁ AQUI</h2>
                  <p className="text-gray-400 text-sm">
                    {userPositions.length > 0
                      ? `Você tem ${userPositions.length} posição(ões) ativa(s) na matriz`
                      : 'Você ainda não tem posições na matriz. Compre uma cota para entrar!'
                    }
                  </p>
                </div>
              </div>

              {userPositions.length === 0 ? (
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-8 text-center">
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="font-orbitron text-xl text-white mb-2">Entre na Matriz!</h3>
                  <p className="text-gray-400 mb-4">Compre sua primeira cota e comece a ganhar</p>
                  <Link href="/dashboard/quotas" className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white hover:opacity-90 transition-opacity">
                    Comprar Cota
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        className={`cursor-pointer rounded-xl p-5 transition-all transform hover:scale-[1.02] ${
                          isAboutToCycle
                            ? 'bg-gradient-to-br from-green-600/40 to-emerald-600/40 border-2 border-green-400 shadow-lg shadow-green-500/20'
                            : 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30'
                        }`}
                      >
                        {/* Badge de status */}
                        {isAboutToCycle && (
                          <div className="absolute -top-2 -right-2 px-3 py-1 bg-green-500 rounded-full text-xs font-bold text-white animate-pulse">
                            PRÓXIMO!
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-orbitron font-bold text-lg ${
                              isAboutToCycle ? 'bg-green-500' : 'bg-purple-600'
                            }`}>
                              N{pos.level}
                            </div>
                            <div>
                              <div className="text-white font-bold">Nível {pos.level}</div>
                              <div className="text-gray-400 text-sm">${LEVEL_CONFIG.ENTRY_VALUES[pos.level - 1]}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-400 text-sm">Cota</div>
                            <div className="text-white font-bold">#{pos.quotaNumber}</div>
                          </div>
                        </div>

                        {/* Posição Grande e Destacada */}
                        <div className="text-center py-4 bg-black/30 rounded-xl mb-4">
                          <div className="text-gray-400 text-sm mb-1">Sua Posição</div>
                          <div className={`text-5xl font-bold font-orbitron ${
                            isAboutToCycle ? 'text-green-400' : 'text-white'
                          }`}>
                            #{pos.position}
                          </div>
                          <div className="text-gray-400 text-sm mt-1">de {pos.totalInQueue} na fila</div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="mb-4">
                          <div className="h-3 bg-black/30 rounded-full overflow-hidden">
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

                        {/* Info de quanto falta */}
                        <div className={`text-center p-3 rounded-lg ${
                          isAboutToCycle ? 'bg-green-500/20' : 'bg-white/5'
                        }`}>
                          {isAboutToCycle ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-2xl">🔥</span>
                              <span className="text-green-400 font-bold">
                                {pos.position === 1 ? 'VOCÊ É O PRÓXIMO!' : `Faltam apenas ${positionsUntil} posições!`}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-gray-400">Faltam </span>
                              <span className="text-white font-bold">{positionsUntil} posições</span>
                              <span className="text-gray-400"> para o ciclo</span>
                            </div>
                          )}
                        </div>

                        {/* Ganho esperado */}
                        <div className="mt-4 text-center">
                          <span className="text-gray-400 text-sm">Ao ciclar você recebe: </span>
                          <span className="text-emerald-400 font-bold">${LEVEL_CONFIG.REWARD_VALUES[pos.level - 1]}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Grid de Todos os Níveis */}
            <div className="mb-8">
              <h2 className="font-orbitron text-lg mb-4 text-gray-400">Visão Geral dos Níveis</h2>
              <div className="grid grid-cols-5 gap-3">
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
                      className={`p-3 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 ring-2 ring-purple-400'
                          : userPos
                          ? 'bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/50 hover:border-green-400'
                          : 'bg-white/5 border border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-orbitron font-bold text-white">N{level}</span>
                        {userPos && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/30 text-green-400">
                            #{userPos.position}
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-bold text-white">${LEVEL_CONFIG.ENTRY_VALUES[level - 1]}</div>
                      <div className="text-xs text-gray-400">
                        {levelData?.totalInQueue || 0} na fila
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fila do Nível Selecionado */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-orbitron text-xl text-white">
                  Fila do Nível {selectedLevel}
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">
                    {totalInQueue} pessoas na fila
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Caixa: ${getLevelData(selectedLevel)?.cashBalance?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>

              {/* Indicador se usuário está nesta fila */}
              {getUserPositionInLevel(selectedLevel) && (
                <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <span className="text-yellow-400 font-bold">Você está na posição #{getUserPositionInLevel(selectedLevel)?.position}</span>
                      <span className="text-gray-400"> desta fila</span>
                    </div>
                  </div>
                </div>
              )}

              {queueLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : queueItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-4">📭</p>
                  <p>Nenhuma pessoa na fila deste nível</p>
                </div>
              ) : (
                <>
                  {/* Tabela da Fila */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Posição</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Usuário</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Tempo na Fila</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Reentradas</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Score</th>
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
                                  ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-l-4 border-l-yellow-500'
                                  : isTop7
                                  ? 'bg-green-500/10'
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <span className={`font-orbitron font-bold text-lg ${
                                    isCurrentUser ? 'text-yellow-400' : isTop7 ? 'text-green-400' : 'text-white'
                                  }`}>
                                    #{item.position}
                                  </span>
                                  {isTop7 && <span className="text-sm">🔥</span>}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  {isCurrentUser && (
                                    <span className="px-2 py-1 bg-yellow-500 rounded text-xs font-bold text-black">
                                      VOCÊ
                                    </span>
                                  )}
                                  <span className={isCurrentUser ? 'text-yellow-400 font-bold' : 'text-white'}>
                                    {item.name || 'Anônimo'}
                                  </span>
                                  <span className="text-gray-500 text-sm">({item.code})</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-gray-400">
                                {item.timeInQueue}
                              </td>
                              <td className="py-4 px-4 text-gray-400">
                                {item.reentries}x
                              </td>
                              <td className="py-4 px-4 text-right">
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
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                      >
                        ◀ Anterior
                      </button>
                      <span className="text-gray-400 px-4">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                      >
                        Próxima ▶
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Legenda */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500"></div>
                    <span className="text-gray-400">Sua posição na fila</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/30 border border-green-500"></div>
                    <span className="text-gray-400">Posições 1-7 (próximos a ciclar)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔥</span>
                    <span className="text-gray-400">Vai ciclar em breve</span>
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
