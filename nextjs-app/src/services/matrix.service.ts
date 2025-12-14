// 7iATLAS - Matrix Service
// Sistema de processamento da matriz 6x1
// Versão 2.0 - Com CAP Progressivo, Bônus Variável e Jupiter Pool

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

// Configuração do Jupiter Pool
const JUPITER_POOL_PERCENT = 0.10 // 10% do recebedor vai para Jupiter Pool

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
 * Calcula o ganho líquido do recebedor (após desconto Jupiter Pool)
 * Ganho líquido = Reward - 10% Jupiter Pool
 */
export function calculateNetReward(level: number): number {
  const reward = calculateReward(level)
  return reward * (1 - JUPITER_POOL_PERCENT) // 90% do reward
}

/**
 * Calcula o valor que vai para o Jupiter Pool
 */
export function calculateJupiterPoolAmount(level: number): number {
  const reward = calculateReward(level)
  return reward * JUPITER_POOL_PERCENT // 10% do reward
}

/**
 * CAP PROGRESSIVO DE INDICADOS
 * Calcula pontos de indicados com rendimento decrescente
 *
 * Faixas:
 * - 1 a 10 indicados: ×10 pontos (máx 100 pts)
 * - 11 a 30 indicados: ×5 pontos (máx 100 pts)
 * - 31 a 50 indicados: ×2 pontos (máx 40 pts)
 * - 51 a 100 indicados: ×1 ponto (máx 50 pts)
 * - 100+ indicados: ×0 pontos (CAP atingido)
 *
 * CAP MÁXIMO TOTAL: 290 pontos
 */
export function calculateReferralPoints(referralsCount: number): number {
  let points = 0

  // Faixa 1: 1-10 indicados (×10)
  points += Math.min(10, referralsCount) * 10

  // Faixa 2: 11-30 indicados (×5)
  if (referralsCount > 10) {
    points += Math.min(20, referralsCount - 10) * 5
  }

  // Faixa 3: 31-50 indicados (×2)
  if (referralsCount > 30) {
    points += Math.min(20, referralsCount - 30) * 2
  }

  // Faixa 4: 51-100 indicados (×1)
  if (referralsCount > 50) {
    points += Math.min(50, referralsCount - 50) * 1
  }

  // CAP: máximo 290 pontos
  return Math.min(points, 290)
}

/**
 * Calcula o score de um usuário na fila
 * Score = (tempo_espera × 2) + (reentradas × 1.5) + pontos_indicados (CAP 290)
 */
export function calculateScore(
  waitingHours: number,
  reentries: number,
  referralsCount: number
): number {
  const referralPoints = calculateReferralPoints(referralsCount)
  return (waitingHours * 2) + (reentries * 1.5) + referralPoints
}

/**
 * BÔNUS DE INDICAÇÃO VARIÁVEL
 * Calcula a porcentagem de bônus baseado no número de indicados ativos
 *
 * Regras:
 * - 0-4 indicados: 0% (sem bônus)
 * - 5-9 indicados: 20% do valor
 * - 10+ indicados: 40% do valor
 *
 * @param referralsCount Número de indicados ativos do indicador
 * @returns Porcentagem de bônus (0, 0.20 ou 0.40)
 */
export function calculateBonusPercent(referralsCount: number): number {
  if (referralsCount < 5) return 0      // 0-4: sem bônus
  if (referralsCount < 10) return 0.20  // 5-9: 20%
  return 0.40                            // 10+: 40%
}

/**
 * Calcula o valor do bônus de indicação
 * Considera o número de indicados ativos do indicador
 */
export function calculateBonus(level: number, referralsCount: number): number {
  const levelValue = calculateLevelValue(level)
  const bonusPercent = calculateBonusPercent(referralsCount)
  return levelValue * bonusPercent
}

/**
 * Calcula o bônus máximo possível (40%) - para referência
 */
export function calculateMaxBonus(level: number): number {
  return calculateLevelValue(level) * 0.4
}

// ==========================================
// VALIDAÇÃO DE COMPRA EM NÍVEIS SUPERIORES
// ==========================================

/**
 * Verifica se usuário pode comprar cota em determinado nível
 * Regra: Deve ter pelo menos 1 cota no nível anterior (N-1)
 */
export async function canBuyQuotaAtLevel(
  userId: string,
  level: number
): Promise<{ canBuy: boolean; reason: string }> {
  // Nível 1 sempre permitido
  if (level === 1) {
    return { canBuy: true, reason: 'OK' }
  }

  // Para níveis > 1, verificar se tem cota no nível anterior
  const previousLevel = await prisma.level.findUnique({
    where: { levelNumber: level - 1 },
  })

  if (!previousLevel) {
    return { canBuy: false, reason: `Nível ${level - 1} não encontrado` }
  }

  const quotasInPreviousLevel = await prisma.queueEntry.count({
    where: {
      userId,
      levelId: previousLevel.id,
      status: { in: ['WAITING', 'PROCESSING'] },
    },
  })

  // Também verificar histórico de ciclos completados no nível anterior
  const cyclesInPreviousLevel = await prisma.cycleHistory.count({
    where: {
      userId,
      levelId: previousLevel.id,
    },
  })

  if (quotasInPreviousLevel === 0 && cyclesInPreviousLevel === 0) {
    return {
      canBuy: false,
      reason: `Precisa ter pelo menos 1 cota no Nível ${level - 1} primeiro`,
    }
  }

  return { canBuy: true, reason: 'OK' }
}

/**
 * Conta quantas cotas um usuário tem em um nível específico
 */
export async function countUserQuotasAtLevel(
  userId: string,
  levelNumber: number
): Promise<number> {
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

// ==========================================
// JUPITER POOL
// ==========================================

/**
 * Adiciona valor ao Jupiter Pool
 */
export async function addToJupiterPool(amount: number, levelNumber: number) {
  await prisma.systemFunds.update({
    where: { id: 1 },
    data: {
      jupiterPool: { increment: amount },
    },
  })

  // Registra no histórico do Jupiter Pool
  await prisma.jupiterPoolHistory.create({
    data: {
      amount,
      levelNumber,
      type: 'DEPOSIT',
      description: `10% do ciclo Nível ${levelNumber}`,
    },
  })
}

/**
 * Obtém saldo atual do Jupiter Pool
 */
export async function getJupiterPoolBalance(): Promise<number> {
  const funds = await prisma.systemFunds.findUnique({
    where: { id: 1 },
  })
  return funds?.jupiterPool?.toNumber() || 0
}

/**
 * Usa Jupiter Pool para cobrir déficit de caixa em um nível
 * Prioriza níveis mais baixos (cascata)
 */
export async function useJupiterPoolForLevel(
  levelNumber: number,
  neededAmount: number
): Promise<{ used: boolean; amount: number }> {
  const poolBalance = await getJupiterPoolBalance()

  if (poolBalance <= 0) {
    return { used: false, amount: 0 }
  }

  const amountToUse = Math.min(poolBalance, neededAmount)

  // Deduz do Jupiter Pool
  await prisma.systemFunds.update({
    where: { id: 1 },
    data: {
      jupiterPool: { decrement: amountToUse },
    },
  })

  // Adiciona ao caixa do nível
  await prisma.level.update({
    where: { levelNumber },
    data: {
      cashBalance: { increment: amountToUse },
    },
  })

  // Registra no histórico
  await prisma.jupiterPoolHistory.create({
    data: {
      amount: amountToUse,
      levelNumber,
      type: 'WITHDRAWAL',
      description: `Injeção de liquidez no Nível ${levelNumber}`,
    },
  })

  return { used: true, amount: amountToUse }
}

// ==========================================
// FUNÇÕES DE FILA
// ==========================================

/**
 * Adiciona usuário à fila de um nível
 */
export async function addToQueue(userId: string, levelNumber: number) {
  const level = await prisma.level.findUnique({
    where: { levelNumber },
  })

  if (!level) {
    throw new Error(`Nível ${levelNumber} não encontrado`)
  }

  // Verifica se já está na fila deste nível
  const existingEntry = await prisma.queueEntry.findFirst({
    where: {
      userId,
      levelId: level.id,
      status: 'WAITING',
    },
  })

  if (existingEntry) {
    // Incrementa reentradas
    await prisma.queueEntry.update({
      where: { id: existingEntry.id },
      data: { reentries: { increment: 1 } },
    })
    return existingEntry
  }

  // Cria nova entrada na fila
  const entry = await prisma.queueEntry.create({
    data: {
      userId,
      levelId: level.id,
      status: 'WAITING',
      score: 0,
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
      user: {
        include: {
          referrals: true,
        },
      },
    },
  })
}

// ==========================================
// PROCESSAMENTO DE CICLO
// ==========================================

/**
 * Verifica se um nível pode processar um ciclo
 * Inclui verificação de Jupiter Pool para cobrir déficit
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
  const currentBalance = level.cashBalance.toNumber()

  if (currentBalance >= requiredAmount) return true

  // Se não tem saldo suficiente, verifica Jupiter Pool
  const deficit = requiredAmount - currentBalance
  const jupiterBalance = await getJupiterPoolBalance()

  // Pode processar se Jupiter Pool cobre o déficit
  return jupiterBalance >= deficit
}

/**
 * Processa um ciclo completo da matriz
 * Com Jupiter Pool e Bônus Variável
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

  const entryValue = level.entryValue.toNumber()
  const requiredAmount = entryValue * MATRIX_SIZE
  const currentBalance = level.cashBalance.toNumber()

  // Se precisar, usa Jupiter Pool para cobrir déficit
  if (currentBalance < requiredAmount) {
    const deficit = requiredAmount - currentBalance
    await useJupiterPoolForLevel(levelNumber, deficit)
  }

  // Obtém os 7 participantes
  const participants = await getNextMatrixParticipants(levelNumber)

  if (participants.length < MATRIX_SIZE) {
    throw new Error('Participantes insuficientes')
  }

  // Gera ID único para este ciclo
  const cycleGroupId = `cycle_${Date.now()}_${levelNumber}`

  const rewardValue = level.rewardValue.toNumber()

  // Processa cada posição
  const results = []

  for (let i = 0; i < MATRIX_SIZE; i++) {
    const participant = participants[i]
    const position = POSITIONS[i]

    let amount = 0
    let action = ''

    switch (position) {
      case 'RECEIVER':
        // Recebedor ganha 2x - 10% Jupiter Pool = 90%
        const grossReward = rewardValue
        const jupiterAmount = grossReward * JUPITER_POOL_PERCENT
        const netReward = grossReward - jupiterAmount
        amount = netReward
        action = 'receive'

        // Adiciona 10% ao Jupiter Pool
        await addToJupiterPool(jupiterAmount, levelNumber)

        // Paga ao recebedor (90%)
        await processPayment(participant.user.walletAddress, netReward, `Ciclo Nível ${levelNumber}`)

        // Atualiza saldo do usuário
        await prisma.user.update({
          where: { id: participant.userId },
          data: { totalEarned: { increment: netReward } },
        })

        // Avança para próximo nível (se não for nível 10)
        if (levelNumber < 10) {
          await addToQueue(participant.userId, levelNumber + 1)
        }

        // Reentra no mesmo nível
        await addToQueue(participant.userId, levelNumber)

        // Paga bônus ao indicador (com nova regra variável)
        if (participant.user.referrerId) {
          await payReferralBonus(
            participant.user.referrerId,
            participant.userId,
            levelNumber
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
        // Distribui: 10% reserva, 10% operacional, 40% bônus (variável), 40% lucro
        amount = entryValue
        action = 'community'

        const reserveAmount = amount * 0.10
        const operationalAmount = amount * 0.10
        const maxBonusAmount = amount * 0.40
        const profitAmount = amount * 0.40

        // Verifica se tem indicador e calcula bônus variável
        let actualBonusAmount = 0
        let unusedBonusAmount = maxBonusAmount

        if (participant.user.referrerId) {
          const referrer = await prisma.user.findUnique({
            where: { id: participant.user.referrerId },
            include: { referrals: true },
          })

          if (referrer && referrer.status === 'ACTIVE') {
            const referrerActiveReferrals = referrer.referrals.filter(r => r.status === 'ACTIVE').length
            const bonusPercent = calculateBonusPercent(referrerActiveReferrals)
            actualBonusAmount = amount * bonusPercent
            unusedBonusAmount = maxBonusAmount - actualBonusAmount
          }
        }

        await prisma.systemFunds.update({
          where: { id: 1 },
          data: {
            reserve: { increment: reserveAmount },
            operational: { increment: operationalAmount },
            profit: { increment: profitAmount + unusedBonusAmount },
          },
        })

        // Se tiver bônus a pagar
        if (actualBonusAmount > 0 && participant.user.referrerId) {
          await payReferralBonusAmount(
            participant.user.referrerId,
            participant.userId,
            levelNumber,
            actualBonusAmount
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
 * Paga bônus de indicação (com regra variável)
 */
async function payReferralBonus(
  referrerId: string,
  referredId: string,
  levelNumber: number
) {
  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
    include: { referrals: true },
  })

  if (!referrer || referrer.status !== 'ACTIVE') return

  // Conta indicados ativos
  const activeReferrals = referrer.referrals.filter(r => r.status === 'ACTIVE').length

  // Calcula bônus variável
  const bonusAmount = calculateBonus(levelNumber, activeReferrals)

  if (bonusAmount <= 0) {
    // Indicador não tem indicados suficientes para receber bônus
    // O valor vai para o lucro do sistema
    const maxBonus = calculateMaxBonus(levelNumber)
    await prisma.systemFunds.update({
      where: { id: 1 },
      data: { profit: { increment: maxBonus } },
    })
    return
  }

  await payReferralBonusAmount(referrerId, referredId, levelNumber, bonusAmount)

  // Se bônus < 40%, a diferença vai para lucro
  const maxBonus = calculateMaxBonus(levelNumber)
  const unusedBonus = maxBonus - bonusAmount
  if (unusedBonus > 0) {
    await prisma.systemFunds.update({
      where: { id: 1 },
      data: { profit: { increment: unusedBonus } },
    })
  }
}

/**
 * Paga um valor específico de bônus
 */
async function payReferralBonusAmount(
  referrerId: string,
  referredId: string,
  levelNumber: number,
  amount: number
) {
  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
  })

  if (!referrer) return

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

/**
 * Compra cota adicional em um nível
 */
export async function buyQuotaAtLevel(
  userId: string,
  levelNumber: number,
  depositTxHash: string
) {
  // Valida se pode comprar
  const { canBuy, reason } = await canBuyQuotaAtLevel(userId, levelNumber)
  if (!canBuy) {
    throw new Error(reason)
  }

  const entryValue = calculateLevelValue(levelNumber)

  // Registra transação
  await prisma.transaction.create({
    data: {
      userId,
      type: 'DEPOSIT',
      amount: entryValue,
      txHash: depositTxHash,
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      description: `Compra de cota - Nível ${levelNumber}`,
    },
  })

  // Adiciona ao caixa do nível
  await prisma.level.update({
    where: { levelNumber },
    data: { cashBalance: { increment: entryValue } },
  })

  // Adiciona à fila do nível
  await addToQueue(userId, levelNumber)

  // Atualiza totais
  await prisma.user.update({
    where: { id: userId },
    data: { totalDeposited: { increment: entryValue } },
  })

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
  calculateNetReward,
  calculateJupiterPoolAmount,
  calculateReferralPoints,
  calculateScore,
  calculateBonusPercent,
  calculateBonus,
  calculateMaxBonus,

  // Validações
  canBuyQuotaAtLevel,
  countUserQuotasAtLevel,

  // Jupiter Pool
  addToJupiterPool,
  getJupiterPoolBalance,
  useJupiterPoolForLevel,

  // Filas
  addToQueue,
  updateQueueScores,
  getNextMatrixParticipants,

  // Ciclos
  canProcessCycle,
  processCycle,

  // Usuários
  activateUser,
  buyQuotaAtLevel,
}
