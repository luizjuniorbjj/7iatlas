// 7iATLAS - Matrix Service
// Sistema de processamento da matriz 6x1
// Versão 1.4 - Suporte a múltiplas cotas e compra em níveis superiores

import prisma from '@/lib/prisma'
import { CyclePosition } from '@/types'
import { blockchainService } from './blockchain.service'

// ==========================================
// CONSTANTES
// ==========================================

const MATRIX_SIZE = 7 // 1 recebedor + 6 posições
const POSITIONS: CyclePosition[] = [
  'RECEIVER',   // 0 - Recebedor
  'DONATE_1',   // 1 - Doa para recebedor
  'ADVANCE_1',  // 2 - Avança nível
  'DONATE_2',   // 3 - Doa para recebedor
  'ADVANCE_2',  // 4 - Avança nível
  'COMMUNITY',  // 5 - Comunidade
  'REENTRY',    // 6 - Reentrada
]

// ==========================================
// TIPOS
// ==========================================

interface QuotaPurchaseResult {
  success: boolean
  quotaId?: string
  quotaNumber?: number
  error?: string
}

interface CanPurchaseResult {
  canPurchase: boolean
  reason?: string
}

// ==========================================
// FUNÇÕES DE CÁLCULO
// ==========================================

/**
 * Calcula o valor de entrada para um nível
 * Fórmula: 10 * 2^(nivel-1)
 */
export function calculateLevelValue(level: number): number {
  return 10 * Math.pow(2, level - 1)
}

/**
 * Calcula o ganho por ciclo (2x o valor de entrada)
 */
export function calculateReward(level: number): number {
  return calculateLevelValue(level) * 2
}

/**
 * Calcula o bônus de indicação (40% do valor)
 */
export function calculateBonus(level: number): number {
  return calculateLevelValue(level) * 0.4
}

/**
 * Calcula o score de um usuário na fila
 * Score = (tempo_espera × 2) + (reentradas × 1.5) + (indicados × 10)
 */
export function calculateScore(
  waitingHours: number,
  reentries: number,
  referralsCount: number
): number {
  return (waitingHours * 2) + (reentries * 1.5) + (referralsCount * 10)
}

// ==========================================
// FUNÇÕES DE FILA
// ==========================================

/**
 * Adiciona usuário à fila de um nível (suporta múltiplas cotas)
 * @param userId ID do usuário
 * @param levelNumber Número do nível
 * @param isNewQuota Se true, cria nova cota; se false, incrementa reentradas da primeira cota
 * @returns A entrada na fila criada ou atualizada
 */
export async function addToQueue(userId: string, levelNumber: number, isNewQuota: boolean = false) {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) {
    throw new Error(`Nível ${levelNumber} não encontrado`)
  }

  // Se não é nova cota, verifica se já está na fila e incrementa reentradas
  if (!isNewQuota) {
    const existingEntry = await prisma.queueEntry.findFirst({
      where: {
        userId,
        levelId: level.id,
        status: 'WAITING',
      },
      orderBy: { quotaNumber: 'asc' },  // Pega a primeira cota
    })

    if (existingEntry) {
      // Incrementa reentradas da cota existente
      await prisma.queueEntry.update({
        where: { id: existingEntry.id },
        data: { reentries: { increment: 1 } },
      })
      return existingEntry
    }
  }

  // Conta quantas cotas o usuário já tem neste nível (todas, não só WAITING)
  const quotaCount = await prisma.queueEntry.count({
    where: {
      userId,
      levelId: level.id,
    },
  })

  // Cria nova entrada na fila (nova cota)
  const entry = await prisma.queueEntry.create({
    data: {
      userId,
      levelId: level.id,
      status: 'WAITING',
      score: 0,
      quotaNumber: quotaCount + 1,
    },
  })

  // Atualiza total de usuários no nível
  await prisma.level.update({
    where: { id: level.id },
    data: { totalUsers: { increment: 1 } },
  })

  return entry
}

/**
 * Conta cotas ativas de um usuário em um nível
 */
export async function countUserQuotas(userId: string, levelNumber: number): Promise<number> {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) return 0

  return prisma.queueEntry.count({
    where: {
      userId,
      levelId: level.id,
      status: 'WAITING',
    },
  })
}

/**
 * Verifica se usuário pode comprar cota em um nível
 */
export async function canPurchaseQuota(userId: string, levelNumber: number): Promise<CanPurchaseResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return { canPurchase: false, reason: 'Usuário não encontrado' }
  }

  if (user.status !== 'ACTIVE') {
    return { canPurchase: false, reason: 'Usuário não está ativo' }
  }

  // Nível 1 sempre permitido para usuários ativos
  if (levelNumber === 1) {
    return { canPurchase: true }
  }

  // Para níveis > 1, verificar se tem cota no nível anterior
  const previousLevelQuotas = await countUserQuotas(userId, levelNumber - 1)

  if (previousLevelQuotas === 0) {
    // Verifica também se já teve cota no nível anterior (já pode ter ciclado)
    const level = await prisma.level.findUnique({
      where: { levelNumber: levelNumber - 1 },
    })

    if (level) {
      const hadQuota = await prisma.queueEntry.count({
        where: {
          userId,
          levelId: level.id,
        },
      })

      if (hadQuota === 0) {
        return {
          canPurchase: false,
          reason: `Precisa ter pelo menos 1 cota no Nível ${levelNumber - 1} primeiro`,
        }
      }
    }
  }

  return { canPurchase: true }
}

/**
 * Compra uma nova cota em um nível específico
 */
export async function purchaseQuota(
  userId: string,
  levelNumber: number,
  txHash?: string
): Promise<QuotaPurchaseResult> {
  // Verifica se pode comprar
  const canPurchase = await canPurchaseQuota(userId, levelNumber)
  if (!canPurchase.canPurchase) {
    return { success: false, error: canPurchase.reason }
  }

  const entryValue = calculateLevelValue(levelNumber)

  // Verifica saldo do usuário (se pagando com saldo interno)
  if (!txHash) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.balance.toNumber() < entryValue) {
      return { success: false, error: 'Saldo insuficiente' }
    }

    // Debita do saldo
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: { decrement: entryValue },
        totalDeposited: { increment: entryValue },
      },
    })
  } else {
    // Pagamento via blockchain - atualiza totalDeposited
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalDeposited: { increment: entryValue },
      },
    })
  }

  // Cria nova cota na fila
  const entry = await addToQueue(userId, levelNumber, true)

  // Adiciona ao caixa do nível
  await prisma.level.update({
    where: { levelNumber },
    data: { cashBalance: { increment: entryValue } },
  })

  // Registra transação
  await prisma.transaction.create({
    data: {
      userId,
      type: 'QUOTA_PURCHASE',
      amount: entryValue,
      txHash,
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      description: `Compra de cota - Nível ${levelNumber}`,
      metadata: {
        levelNumber,
        quotaNumber: entry.quotaNumber,
      },
    },
  })

  // Atualiza totais do sistema
  await prisma.systemFunds.update({
    where: { id: 1 },
    data: { totalIn: { increment: entryValue } },
  })

  return {
    success: true,
    quotaId: entry.id,
    quotaNumber: entry.quotaNumber,
  }
}

/**
 * Lista todas as cotas de um usuário em um nível
 */
export async function getUserQuotas(userId: string, levelNumber: number) {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) return []

  return prisma.queueEntry.findMany({
    where: {
      userId,
      levelId: level.id,
    },
    orderBy: { quotaNumber: 'asc' },
  })
}

/**
 * Lista todas as cotas de um usuário em todos os níveis
 */
export async function getAllUserQuotas(userId: string) {
  return prisma.queueEntry.findMany({
    where: { userId },
    include: {
      level: true,
    },
    orderBy: [
      { levelId: 'asc' },
      { quotaNumber: 'asc' },
    ],
  })
}

/**
 * Atualiza scores de todos na fila
 */
export async function updateQueueScores(levelNumber: number) {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) return

  const entries = await prisma.queueEntry.findMany({
    where: {
      levelId: level.id,
      status: 'WAITING',
    },
    include: {
      user: {
        include: {
          referrals: true,
        },
      },
    },
  })

  for (const entry of entries) {
    const waitingHours = (Date.now() - entry.enteredAt.getTime()) / (1000 * 60 * 60)
    const referralsCount = entry.user.referrals.filter(r => r.status === 'ACTIVE').length
    const newScore = calculateScore(waitingHours, entry.reentries, referralsCount)

    await prisma.queueEntry.update({
      where: { id: entry.id },
      data: { score: newScore },
    })
  }
}

/**
 * Obtém os próximos 7 usuários da fila (ordenados por score)
 */
export async function getNextMatrixParticipants(levelNumber: number) {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) return []

  // Atualiza scores primeiro
  await updateQueueScores(levelNumber)

  // Busca os 7 com maior score
  return prisma.queueEntry.findMany({
    where: {
      levelId: level.id,
      status: 'WAITING',
    },
    orderBy: { score: 'desc' },
    take: MATRIX_SIZE,
    include: {
      user: true,
    },
  })
}

// ==========================================
// PROCESSAMENTO DE CICLO
// ==========================================

/**
 * Verifica se um nível pode processar um ciclo
 */
export async function canProcessCycle(levelNumber: number): Promise<boolean> {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) return false

  // Verifica se tem 7 pessoas na fila
  const queueCount = await prisma.queueEntry.count({
    where: {
      levelId: level.id,
      status: 'WAITING',
    },
  })

  if (queueCount < MATRIX_SIZE) return false

  // Verifica se tem saldo suficiente no caixa
  const requiredAmount = level.entryValue.toNumber() * MATRIX_SIZE
  return level.cashBalance.toNumber() >= requiredAmount
}

/**
 * Processa um ciclo completo da matriz
 */
export async function processCycle(levelNumber: number) {
  // Verifica se pode processar
  if (!(await canProcessCycle(levelNumber))) {
    throw new Error('Não é possível processar ciclo: requisitos não atendidos')
  }

  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) throw new Error('Nível não encontrado')

  // Obtém os 7 participantes
  const participants = await getNextMatrixParticipants(levelNumber)

  if (participants.length < MATRIX_SIZE) {
    throw new Error('Participantes insuficientes')
  }

  // Gera ID único para este ciclo
  const cycleGroupId = `cycle_${Date.now()}_${levelNumber}`

  const entryValue = level.entryValue.toNumber()
  const rewardValue = level.rewardValue.toNumber()
  const bonusValue = level.bonusValue.toNumber()

  // Processa cada posição
  const results = []

  for (let i = 0; i < MATRIX_SIZE; i++) {
    const participant = participants[i]
    const position = POSITIONS[i]

    let amount = 0
    let action = ''

    switch (position) {
      case 'RECEIVER':
        // Recebedor ganha 2x
        amount = rewardValue
        action = 'receive'

        // Paga ao recebedor
        await processPayment(participant.user.walletAddress, amount, `Ciclo Nível ${levelNumber}`)

        // Atualiza saldo do usuário
        await prisma.user.update({
          where: { id: participant.userId },
          data: { totalEarned: { increment: amount } },
        })

        // Avança para próximo nível (se não for nível 10)
        if (levelNumber < 10) {
          await addToQueue(participant.userId, levelNumber + 1)
        }

        // Reentra no mesmo nível
        await addToQueue(participant.userId, levelNumber)

        // Paga bônus ao indicador
        if (participant.user.referrerId) {
          await payReferralBonus(
            participant.user.referrerId,
            participant.userId,
            levelNumber,
            bonusValue
          )
        }
        break

      case 'DONATE_1':
      case 'DONATE_2':
        // Doa para o recebedor (já contabilizado no reward)
        amount = entryValue
        action = 'donate'
        break

      case 'ADVANCE_1':
      case 'ADVANCE_2':
        // Alimenta o caixa do próximo nível
        amount = entryValue
        action = 'advance'

        if (levelNumber < 10) {
          await prisma.level.update({
            where: { levelNumber: levelNumber + 1 },
            data: { cashBalance: { increment: amount } },
          })
        }
        break

      case 'COMMUNITY':
        // Distribui: 10% reserva, 10% operacional, 40% bônus (se houver), 40% lucro
        amount = entryValue
        action = 'community'

        const reserveAmount = amount * 0.10
        const operationalAmount = amount * 0.10
        const bonusAmount = amount * 0.40
        const profitAmount = amount * 0.40

        await prisma.systemFunds.update({
          where: { id: 1 },
          data: {
            reserve: { increment: reserveAmount },
            operational: { increment: operationalAmount },
            profit: { increment: profitAmount + (participant.user.referrerId ? 0 : bonusAmount) },
          },
        })

        // Se tiver indicador, paga bônus
        if (participant.user.referrerId) {
          await payReferralBonus(
            participant.user.referrerId,
            participant.userId,
            levelNumber,
            bonusAmount
          )
        }
        break

      case 'REENTRY':
        // Valor volta ao caixa do mesmo nível
        amount = entryValue
        action = 'reentry'

        await prisma.level.update({
          where: { levelNumber },
          data: { cashBalance: { increment: amount } },
        })
        break
    }

    // Registra no histórico
    await prisma.cycleHistory.create({
      data: {
        userId: participant.userId,
        levelId: level.id,
        position,
        amount,
        cycleGroupId,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    })

    // Marca entrada na fila como processada
    await prisma.queueEntry.update({
      where: { id: participant.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    })

    // Reentrada para posições 1-4 e 6
    if (['DONATE_1', 'ADVANCE_1', 'DONATE_2', 'ADVANCE_2', 'REENTRY'].includes(position)) {
      await addToQueue(participant.userId, levelNumber)
    }

    results.push({
      userId: participant.userId,
      position,
      amount,
      action,
    })
  }

  // Deduz do caixa do nível
  await prisma.level.update({
    where: { levelNumber },
    data: {
      cashBalance: { decrement: entryValue * MATRIX_SIZE },
      totalCycles: { increment: 1 },
    },
  })

  // Atualiza totais do sistema
  await prisma.systemFunds.update({
    where: { id: 1 },
    data: { totalOut: { increment: rewardValue } },
  })

  return {
    cycleGroupId,
    level: levelNumber,
    participants: results,
    totalPaid: rewardValue,
  }
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Processa pagamento via blockchain
 */
async function processPayment(toAddress: string, amount: number, description: string) {
  try {
    const txHash = await blockchainService.sendUSDT(toAddress, amount)
    return txHash
  } catch (error) {
    console.error('Erro ao processar pagamento:', error)
    throw error
  }
}

/**
 * Paga bônus de indicação
 */
async function payReferralBonus(
  referrerId: string,
  referredId: string,
  levelNumber: number,
  amount: number
) {
  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
  })

  if (!referrer || referrer.status !== 'ACTIVE') return

  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) return

  // Paga via blockchain
  try {
    const txHash = await blockchainService.sendUSDT(referrer.walletAddress, amount)

    // Registra bônus
    await prisma.bonusHistory.create({
      data: {
        referrerId,
        referredId,
        levelId: level.id,
        amount,
        txHash,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    })

    // Atualiza total de bônus do indicador
    await prisma.user.update({
      where: { id: referrerId },
      data: { totalBonus: { increment: amount } },
    })
  } catch (error) {
    console.error('Erro ao pagar bônus:', error)
  }
}

/**
 * Ativa usuário após depósito confirmado
 */
export async function activateUser(userId: string, depositTxHash: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) throw new Error('Usuário não encontrado')
  if (user.status === 'ACTIVE') throw new Error('Usuário já está ativo')

  const entryValue = calculateLevelValue(1)

  // Atualiza usuário
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'ACTIVE',
      activatedAt: new Date(),
      totalDeposited: { increment: entryValue },
    },
  })

  // Registra transação
  await prisma.transaction.create({
    data: {
      userId,
      type: 'DEPOSIT',
      amount: entryValue,
      txHash: depositTxHash,
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      description: 'Depósito inicial - Ativação',
    },
  })

  // Adiciona ao caixa do nível 1
  await prisma.level.update({
    where: { levelNumber: 1 },
    data: { cashBalance: { increment: entryValue } },
  })

  // Adiciona à fila do nível 1
  await addToQueue(userId, 1)

  // Atualiza totais do sistema
  await prisma.systemFunds.update({
    where: { id: 1 },
    data: { totalIn: { increment: entryValue } },
  })

  return true
}

// ==========================================
// EXPORTS
// ==========================================

export const matrixService = {
  // Cálculos
  calculateLevelValue,
  calculateReward,
  calculateBonus,
  calculateScore,
  // Fila
  addToQueue,
  updateQueueScores,
  getNextMatrixParticipants,
  // Cotas
  countUserQuotas,
  canPurchaseQuota,
  purchaseQuota,
  getUserQuotas,
  getAllUserQuotas,
  // Ciclos
  canProcessCycle,
  processCycle,
  activateUser,
}
