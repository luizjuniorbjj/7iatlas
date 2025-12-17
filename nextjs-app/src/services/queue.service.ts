// 7iATLAS - Queue Service
// Sistema de visualização de matriz e posição na fila

import prisma from '@/lib/prisma'
// NOTA: matrixService removido pois updateQueueScores não é mais chamado na listagem

// ==========================================
// TIPOS
// ==========================================

interface QueuePosition {
  position: number
  totalInQueue: number
  percentile: number
  estimatedWait: string
  score: number
  enteredAt: Date
  reentries: number
  quotaNumber: number
  cyclesCompleted: number
  totalEarned: number
}

interface LevelStatsData {
  levelId: number
  levelNumber: number
  entryValue: number
  rewardValue: number
  cashBalance: number
  totalCycles: number
  cyclesToday: number
  avgCyclesPerDay: number
  avgWaitTime: number // em minutos
  totalInQueue: number
  oldestEntry: {
    enteredAt: Date
    daysAgo: number
  } | null
}

interface QueueListItem {
  position: number
  userId: string
  name: string
  code: string
  score: number
  timeInQueue: string
  reentries: number
  isCurrentUser: boolean
}

interface QueueListResponse {
  items: QueueListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  currentUserPosition?: number
}

// ==========================================
// FUNÇÕES DE POSIÇÃO
// ==========================================

/**
 * Obtém posição do usuário na fila de um nível
 */
export async function getUserPosition(
  userId: string,
  levelNumber: number
): Promise<QueuePosition | null> {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) return null

  // Busca a entrada do usuário (primeira cota ativa)
  const userEntry = await prisma.queueEntry.findFirst({
    where: {
      userId,
      levelId: level.id,
      status: 'WAITING',
    },
    orderBy: { quotaNumber: 'asc' },
  })

  if (!userEntry) return null

  // Conta quantos têm score maior (estão na frente)
  const aheadCount = await prisma.queueEntry.count({
    where: {
      levelId: level.id,
      status: 'WAITING',
      score: { gt: userEntry.score },
    },
  })

  // Total na fila
  const totalInQueue = await prisma.queueEntry.count({
    where: {
      levelId: level.id,
      status: 'WAITING',
    },
  })

  const position = aheadCount + 1
  const percentile = totalInQueue > 0 ? Math.round((position / totalInQueue) * 100) : 0

  // Busca estatísticas para estimativa
  const stats = await getLevelStats(levelNumber)
  const estimatedWait = estimateWaitTime(position, stats?.avgCyclesPerDay || 0)

  return {
    position,
    totalInQueue,
    percentile,
    estimatedWait,
    score: userEntry.score.toNumber(),
    enteredAt: userEntry.enteredAt,
    reentries: userEntry.reentries,
    quotaNumber: userEntry.quotaNumber,
  }
}

/**
 * Obtém posição de todas as cotas do usuário em um nível
 */
export async function getAllUserPositions(
  userId: string,
  levelNumber: number
): Promise<QueuePosition[]> {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) return []

  const userEntries = await prisma.queueEntry.findMany({
    where: {
      userId,
      levelId: level.id,
      status: 'WAITING',
    },
    orderBy: { quotaNumber: 'asc' },
  })

  const totalInQueue = await prisma.queueEntry.count({
    where: {
      levelId: level.id,
      status: 'WAITING',
    },
  })

  // Busca ciclos completados do usuário neste nível
  // Primeiro tenta CycleHistory, se não tiver, usa Transaction
  let cyclesCompleted = await prisma.cycleHistory.count({
    where: {
      userId,
      levelId: level.id,
      position: 'RECEIVER',
      status: 'CONFIRMED',
    },
  })

  let totalEarned = 0

  if (cyclesCompleted > 0) {
    // Usa CycleHistory se existir
    const cycleEarnings = await prisma.cycleHistory.aggregate({
      where: {
        userId,
        levelId: level.id,
        position: 'RECEIVER',
        status: 'CONFIRMED',
      },
      _sum: {
        amount: true,
      },
    })
    totalEarned = cycleEarnings._sum.amount ? Number(cycleEarnings._sum.amount) : 0
  } else {
    // Fallback: usa Transaction com CYCLE_REWARD para este nível
    // O valor do reward é 2x o entry value do nível
    const rewardValue = level.rewardValue.toNumber()

    const cycleTransactions = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'CYCLE_REWARD',
        amount: rewardValue, // Filtra pelo valor exato do reward deste nível
        status: 'CONFIRMED',
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    cyclesCompleted = cycleTransactions._count || 0
    totalEarned = cycleTransactions._sum.amount ? Number(cycleTransactions._sum.amount) : 0
  }

  const stats = await getLevelStats(levelNumber)
  const positions: QueuePosition[] = []

  for (const entry of userEntries) {
    const aheadCount = await prisma.queueEntry.count({
      where: {
        levelId: level.id,
        status: 'WAITING',
        score: { gt: entry.score },
      },
    })

    const position = aheadCount + 1
    const percentile = totalInQueue > 0 ? Math.round((position / totalInQueue) * 100) : 0
    const estimatedWait = estimateWaitTime(position, stats?.avgCyclesPerDay || 0)

    positions.push({
      position,
      totalInQueue,
      percentile,
      estimatedWait,
      score: entry.score.toNumber(),
      enteredAt: entry.enteredAt,
      reentries: entry.reentries,
      quotaNumber: entry.quotaNumber,
      cyclesCompleted,
      totalEarned,
    })
  }

  return positions
}

// ==========================================
// FUNÇÕES DE ESTATÍSTICAS
// ==========================================

/**
 * Obtém estatísticas de um nível
 */
export async function getLevelStats(levelNumber: number): Promise<LevelStatsData | null> {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
    include: { stats: true },
  })

  if (!level) return null

  // Se tem stats cacheado, usa
  if (level.stats) {
    const totalInQueue = await prisma.queueEntry.count({
      where: {
        levelId: level.id,
        status: 'WAITING',
      },
    })

    const oldestEntry = await prisma.queueEntry.findFirst({
      where: {
        levelId: level.id,
        status: 'WAITING',
      },
      orderBy: { enteredAt: 'asc' },
    })

    return {
      levelId: level.id,
      levelNumber: level.levelNumber,
      entryValue: level.entryValue.toNumber(),
      rewardValue: level.rewardValue.toNumber(),
      cashBalance: level.cashBalance.toNumber(),
      totalCycles: level.stats.totalCycles,
      cyclesToday: level.stats.cyclesToday,
      avgCyclesPerDay: level.stats.avgCyclesPerDay.toNumber(),
      avgWaitTime: level.stats.avgWaitTime,
      totalInQueue,
      oldestEntry: oldestEntry ? {
        enteredAt: oldestEntry.enteredAt,
        daysAgo: Math.floor((Date.now() - oldestEntry.enteredAt.getTime()) / (1000 * 60 * 60 * 24)),
      } : null,
    }
  }

  // Calcula estatísticas se não tem cache
  return calculateLevelStats(levelNumber)
}

/**
 * Calcula e atualiza estatísticas de um nível
 */
export async function calculateLevelStats(levelNumber: number): Promise<LevelStatsData | null> {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Total de ciclos
  const totalCycles = await prisma.cycleHistory.count({
    where: {
      levelId: level.id,
      position: 'RECEIVER',
      status: 'CONFIRMED',
    },
  })

  // Ciclos hoje
  const cyclesToday = await prisma.cycleHistory.count({
    where: {
      levelId: level.id,
      position: 'RECEIVER',
      status: 'CONFIRMED',
      createdAt: { gte: today },
    },
  })

  // Média de ciclos por dia (últimos 30 dias)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const cyclesLast30Days = await prisma.cycleHistory.count({
    where: {
      levelId: level.id,
      position: 'RECEIVER',
      status: 'CONFIRMED',
      createdAt: { gte: thirtyDaysAgo },
    },
  })

  const avgCyclesPerDay = cyclesLast30Days / 30

  // Total na fila
  const totalInQueue = await prisma.queueEntry.count({
    where: {
      levelId: level.id,
      status: 'WAITING',
    },
  })

  // Entrada mais antiga
  const oldestEntry = await prisma.queueEntry.findFirst({
    where: {
      levelId: level.id,
      status: 'WAITING',
    },
    orderBy: { enteredAt: 'asc' },
  })

  // Calcula tempo médio de espera (dos últimos 100 ciclos)
  const recentCycles = await prisma.cycleHistory.findMany({
    where: {
      levelId: level.id,
      position: 'RECEIVER',
      status: 'CONFIRMED',
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // TODO: Calcular tempo médio real baseado no histórico
  const avgWaitTime = avgCyclesPerDay > 0 ? Math.round((7 / avgCyclesPerDay) * 24 * 60) : 0

  // Atualiza ou cria stats
  await prisma.levelStats.upsert({
    where: { levelId: level.id },
    update: {
      totalCycles,
      cyclesToday,
      avgCyclesPerDay,
      avgWaitTime,
      firstCycleAt: oldestEntry?.enteredAt,
      lastCycleAt: recentCycles[0]?.createdAt,
    },
    create: {
      levelId: level.id,
      totalCycles,
      cyclesToday,
      avgCyclesPerDay,
      avgWaitTime,
      firstCycleAt: oldestEntry?.enteredAt,
      lastCycleAt: recentCycles[0]?.createdAt,
    },
  })

  return {
    levelId: level.id,
    levelNumber: level.levelNumber,
    entryValue: level.entryValue.toNumber(),
    rewardValue: level.rewardValue.toNumber(),
    cashBalance: level.cashBalance.toNumber(),
    totalCycles,
    cyclesToday,
    avgCyclesPerDay,
    avgWaitTime,
    totalInQueue,
    oldestEntry: oldestEntry ? {
      enteredAt: oldestEntry.enteredAt,
      daysAgo: Math.floor((Date.now() - oldestEntry.enteredAt.getTime()) / (1000 * 60 * 60 * 24)),
    } : null,
  }
}

/**
 * Obtém estatísticas de todos os níveis
 */
export async function getAllLevelsStats(): Promise<LevelStatsData[]> {
  const stats: LevelStatsData[] = []

  for (let i = 1; i <= 10; i++) {
    const levelStats = await getLevelStats(i)
    if (levelStats) {
      stats.push(levelStats)
    }
  }

  return stats
}

// ==========================================
// FUNÇÕES DE LISTA DA FILA
// ==========================================

/**
 * Obtém lista paginada da fila de um nível
 */
export async function getQueueList(
  levelNumber: number,
  page: number = 1,
  limit: number = 10,
  currentUserId?: string,
  search?: string
): Promise<QueueListResponse> {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) {
    return {
      items: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    }
  }

  // NOTA: Não atualizamos scores aqui pois é muito pesado com muitos usuários
  // Os scores são atualizados em background ou durante processamento de ciclos

  // Monta query base
  const whereClause: any = {
    levelId: level.id,
    status: 'WAITING',
  }

  // Adiciona busca se fornecida
  if (search) {
    whereClause.user = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { referralCode: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  // Total de itens
  const total = await prisma.queueEntry.count({ where: whereClause })
  const totalPages = Math.ceil(total / limit)

  // Busca itens paginados
  const entries = await prisma.queueEntry.findMany({
    where: whereClause,
    orderBy: { score: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          referralCode: true,
          showNameInQueue: true,
        },
      },
    },
  })

  // Calcula posição inicial desta página
  const startPosition = (page - 1) * limit + 1

  const items: QueueListItem[] = entries.map((entry, index) => ({
    position: startPosition + index,
    userId: entry.userId,
    name: entry.user.showNameInQueue
      ? formatName(entry.user.name)
      : 'Anônimo',
    code: entry.user.referralCode,
    score: entry.score.toNumber(),
    timeInQueue: formatTimeInQueue(entry.enteredAt),
    reentries: entry.reentries,
    isCurrentUser: entry.userId === currentUserId,
  }))

  // Se solicitado, encontra posição do usuário atual
  let currentUserPosition: number | undefined
  if (currentUserId) {
    const userEntry = await prisma.queueEntry.findFirst({
      where: {
        userId: currentUserId,
        levelId: level.id,
        status: 'WAITING',
      },
    })

    if (userEntry) {
      const aheadCount = await prisma.queueEntry.count({
        where: {
          levelId: level.id,
          status: 'WAITING',
          score: { gt: userEntry.score },
        },
      })
      currentUserPosition = aheadCount + 1
    }
  }

  return {
    items,
    pagination: { page, limit, total, totalPages },
    currentUserPosition,
  }
}

/**
 * Encontra a página onde o usuário está
 */
export async function findUserPage(
  userId: string,
  levelNumber: number,
  limit: number = 10
): Promise<{ position: number; page: number } | null> {
  const position = await getUserPosition(userId, levelNumber)

  if (!position) return null

  const page = Math.ceil(position.position / limit)

  return {
    position: position.position,
    page,
  }
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Estima tempo de espera baseado na posição e média de ciclos
 */
function estimateWaitTime(position: number, avgCyclesPerDay: number): string {
  if (avgCyclesPerDay === 0) return 'Calculando...'

  // Cada ciclo processa 7 pessoas
  const cyclesNeeded = Math.ceil(position / 7)
  const daysNeeded = cyclesNeeded / avgCyclesPerDay

  if (daysNeeded < 0.04) {
    return '< 1 hora'
  } else if (daysNeeded < 1) {
    const hours = Math.round(daysNeeded * 24)
    return `~${hours} hora${hours > 1 ? 's' : ''}`
  } else if (daysNeeded < 7) {
    const days = Math.round(daysNeeded)
    return `~${days} dia${days > 1 ? 's' : ''}`
  } else {
    const weeks = Math.round(daysNeeded / 7)
    return `~${weeks} semana${weeks > 1 ? 's' : ''}`
  }
}

/**
 * Formata nome para exibição (Primeiro + inicial do sobrenome)
 */
function formatName(name: string | null): string {
  if (!name) return 'Usuário'

  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0]

  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

/**
 * Formata tempo na fila
 */
function formatTimeInQueue(enteredAt: Date): string {
  const diffMs = Date.now() - enteredAt.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays} dia${diffDays > 1 ? 's' : ''}`
  } else if (diffHours > 0) {
    return `${diffHours} hora${diffHours > 1 ? 's' : ''}`
  } else {
    return `${diffMinutes} min`
  }
}

// ==========================================
// EXPORTS
// ==========================================

export const queueService = {
  // Posição
  getUserPosition,
  getAllUserPositions,
  findUserPage,
  // Estatísticas
  getLevelStats,
  calculateLevelStats,
  getAllLevelsStats,
  // Lista
  getQueueList,
}
