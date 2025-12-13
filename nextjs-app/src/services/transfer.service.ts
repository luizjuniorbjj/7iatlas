// 7iATLAS - Transfer Service
// Sistema de transferências internas com PIN de segurança

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// ==========================================
// CONSTANTES
// ==========================================

const PIN_MIN_LENGTH = 4
const PIN_MAX_LENGTH = 6
const PIN_SALT_ROUNDS = 10

// Bloqueio progressivo
const BLOCK_THRESHOLDS = [
  { attempts: 3, blockMinutes: 15 },
  { attempts: 6, blockMinutes: 60 },
  { attempts: 9, blockMinutes: 1440 }, // 24 horas
]

// ==========================================
// TIPOS
// ==========================================

interface TransferResult {
  success: boolean
  transferId?: string
  error?: string
}

interface PinResult {
  success: boolean
  error?: string
}

// ==========================================
// FUNÇÕES DE PIN
// ==========================================

/**
 * Cria PIN para o usuário
 */
export async function createPin(
  userId: string,
  password: string,
  pin: string
): Promise<PinResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return { success: false, error: 'Usuário não encontrado' }
  }

  // Verifica senha
  if (!user.passwordHash) {
    return { success: false, error: 'Usuário não possui senha cadastrada' }
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
  if (!isPasswordValid) {
    return { success: false, error: 'Senha incorreta' }
  }

  // Valida formato do PIN
  if (!isValidPinFormat(pin)) {
    return {
      success: false,
      error: `PIN deve ter entre ${PIN_MIN_LENGTH} e ${PIN_MAX_LENGTH} dígitos numéricos`,
    }
  }

  // Já tem PIN?
  if (user.pinHash) {
    return { success: false, error: 'PIN já configurado. Use a opção de alterar PIN.' }
  }

  // Cria hash do PIN
  const pinHash = await bcrypt.hash(pin, PIN_SALT_ROUNDS)

  await prisma.user.update({
    where: { id: userId },
    data: {
      pinHash,
      pinCreatedAt: new Date(),
      pinAttempts: 0,
      pinBlockedUntil: null,
    },
  })

  return { success: true }
}

/**
 * Altera PIN do usuário
 */
export async function changePin(
  userId: string,
  password: string,
  newPin: string
): Promise<PinResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return { success: false, error: 'Usuário não encontrado' }
  }

  // Verifica senha
  if (!user.passwordHash) {
    return { success: false, error: 'Usuário não possui senha cadastrada' }
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
  if (!isPasswordValid) {
    return { success: false, error: 'Senha incorreta' }
  }

  // Valida formato do PIN
  if (!isValidPinFormat(newPin)) {
    return {
      success: false,
      error: `PIN deve ter entre ${PIN_MIN_LENGTH} e ${PIN_MAX_LENGTH} dígitos numéricos`,
    }
  }

  // Cria hash do novo PIN
  const pinHash = await bcrypt.hash(newPin, PIN_SALT_ROUNDS)

  await prisma.user.update({
    where: { id: userId },
    data: {
      pinHash,
      pinCreatedAt: new Date(),
      pinAttempts: 0,
      pinBlockedUntil: null,
    },
  })

  return { success: true }
}

/**
 * Verifica se o PIN está correto
 */
export async function verifyPin(userId: string, pin: string): Promise<PinResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return { success: false, error: 'Usuário não encontrado' }
  }

  if (!user.pinHash) {
    return { success: false, error: 'PIN não configurado' }
  }

  // Verifica se está bloqueado
  if (user.pinBlockedUntil && user.pinBlockedUntil > new Date()) {
    const remainingMinutes = Math.ceil(
      (user.pinBlockedUntil.getTime() - Date.now()) / (1000 * 60)
    )
    return {
      success: false,
      error: `PIN bloqueado. Tente novamente em ${remainingMinutes} minutos.`,
    }
  }

  // Verifica PIN
  const isPinValid = await bcrypt.compare(pin, user.pinHash)

  if (!isPinValid) {
    // Incrementa tentativas
    const newAttempts = user.pinAttempts + 1

    // Verifica se deve bloquear
    let blockUntil: Date | null = null
    for (const threshold of BLOCK_THRESHOLDS) {
      if (newAttempts >= threshold.attempts) {
        blockUntil = new Date(Date.now() + threshold.blockMinutes * 60 * 1000)
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        pinAttempts: newAttempts,
        pinBlockedUntil: blockUntil,
      },
    })

    if (blockUntil) {
      const blockMinutes = Math.ceil((blockUntil.getTime() - Date.now()) / (1000 * 60))
      return {
        success: false,
        error: `PIN incorreto. Conta bloqueada por ${blockMinutes} minutos.`,
      }
    }

    const remainingAttempts = 3 - (newAttempts % 3)
    return {
      success: false,
      error: `PIN incorreto. ${remainingAttempts} tentativas restantes antes do bloqueio.`,
    }
  }

  // PIN correto - zera tentativas
  await prisma.user.update({
    where: { id: userId },
    data: {
      pinAttempts: 0,
      pinBlockedUntil: null,
    },
  })

  return { success: true }
}

/**
 * Verifica se usuário tem PIN configurado
 */
export async function hasPin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinHash: true },
  })

  return !!user?.pinHash
}

// ==========================================
// FUNÇÕES DE TRANSFERÊNCIA
// ==========================================

/**
 * Realiza transferência interna entre usuários
 */
export async function transfer(
  fromUserId: string,
  toUserIdentifier: string, // pode ser referralCode ou walletAddress
  amount: number,
  pin: string,
  description?: string
): Promise<TransferResult> {
  // Verifica PIN
  const pinResult = await verifyPin(fromUserId, pin)
  if (!pinResult.success) {
    return { success: false, error: pinResult.error }
  }

  // Busca remetente
  const fromUser = await prisma.user.findUnique({
    where: { id: fromUserId },
  })

  if (!fromUser) {
    return { success: false, error: 'Usuário remetente não encontrado' }
  }

  if (fromUser.status !== 'ACTIVE') {
    return { success: false, error: 'Usuário remetente não está ativo' }
  }

  // Busca destinatário (por código ou wallet)
  const toUser = await prisma.user.findFirst({
    where: {
      OR: [
        { referralCode: toUserIdentifier },
        { walletAddress: toUserIdentifier },
      ],
    },
  })

  if (!toUser) {
    return { success: false, error: 'Destinatário não encontrado' }
  }

  if (toUser.status !== 'ACTIVE') {
    return { success: false, error: 'Destinatário não está ativo' }
  }

  if (fromUser.id === toUser.id) {
    return { success: false, error: 'Não é possível transferir para si mesmo' }
  }

  // Busca configurações do sistema
  const config = await prisma.systemConfig.findUnique({
    where: { id: 1 },
  })

  const minAmount = config?.transferMinAmount.toNumber() || 10
  const maxPerDay = config?.transferMaxPerDay || 3
  const dailyLimit = config?.transferLimitNoKyc.toNumber() || 100

  // Validações de valor
  if (amount < minAmount) {
    return { success: false, error: `Valor mínimo de transferência: $${minAmount}` }
  }

  if (fromUser.balance.toNumber() < amount) {
    return { success: false, error: 'Saldo insuficiente' }
  }

  // Verifica limites diários
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const transfersToday = await prisma.internalTransfer.findMany({
    where: {
      fromUserId,
      createdAt: { gte: today },
    },
  })

  if (transfersToday.length >= maxPerDay) {
    return { success: false, error: `Limite de ${maxPerDay} transferências por dia atingido` }
  }

  const totalToday = transfersToday.reduce((sum, t) => sum + t.amount.toNumber(), 0)
  if (totalToday + amount > dailyLimit) {
    return {
      success: false,
      error: `Limite diário de $${dailyLimit} seria excedido. Disponível: $${dailyLimit - totalToday}`,
    }
  }

  // Executa transferência em transação
  const transfer = await prisma.$transaction(async (tx) => {
    // Debita do remetente
    await tx.user.update({
      where: { id: fromUserId },
      data: { balance: { decrement: amount } },
    })

    // Credita no destinatário
    await tx.user.update({
      where: { id: toUser.id },
      data: { balance: { increment: amount } },
    })

    // Registra transferência
    const internalTransfer = await tx.internalTransfer.create({
      data: {
        fromUserId,
        toUserId: toUser.id,
        amount,
        description,
        status: 'COMPLETED',
      },
    })

    // Registra transações para ambos
    await tx.transaction.create({
      data: {
        userId: fromUserId,
        type: 'INTERNAL_TRANSFER_OUT',
        amount,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        description: `Transferência para ${toUser.name || toUser.referralCode}`,
        metadata: {
          transferId: internalTransfer.id,
          toUserId: toUser.id,
        },
      },
    })

    await tx.transaction.create({
      data: {
        userId: toUser.id,
        type: 'INTERNAL_TRANSFER_IN',
        amount,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        description: `Transferência de ${fromUser.name || fromUser.referralCode}`,
        metadata: {
          transferId: internalTransfer.id,
          fromUserId,
        },
      },
    })

    return internalTransfer
  })

  return {
    success: true,
    transferId: transfer.id,
  }
}

/**
 * Lista histórico de transferências do usuário
 */
export async function getTransferHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const [sent, received] = await Promise.all([
    prisma.internalTransfer.findMany({
      where: { fromUserId: userId },
      include: {
        toUser: {
          select: {
            id: true,
            name: true,
            referralCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.internalTransfer.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            referralCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
  ])

  return { sent, received }
}

/**
 * Obtém limites de transferência do usuário
 */
export async function getTransferLimits(userId: string) {
  const config = await prisma.systemConfig.findUnique({
    where: { id: 1 },
  })

  const minAmount = config?.transferMinAmount.toNumber() || 10
  const maxPerDay = config?.transferMaxPerDay || 3
  const dailyLimit = config?.transferLimitNoKyc.toNumber() || 100

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const transfersToday = await prisma.internalTransfer.findMany({
    where: {
      fromUserId: userId,
      createdAt: { gte: today },
    },
  })

  const totalToday = transfersToday.reduce((sum, t) => sum + t.amount.toNumber(), 0)
  const countToday = transfersToday.length

  return {
    minAmount,
    dailyLimit,
    maxTransactionsPerDay: maxPerDay,
    usedToday: totalToday,
    remainingToday: dailyLimit - totalToday,
    transactionsToday: countToday,
    transactionsRemaining: maxPerDay - countToday,
  }
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Valida formato do PIN
 */
function isValidPinFormat(pin: string): boolean {
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) {
    return false
  }
  return /^\d+$/.test(pin)
}

// ==========================================
// EXPORTS
// ==========================================

export const transferService = {
  // PIN
  createPin,
  changePin,
  verifyPin,
  hasPin,
  // Transferências
  transfer,
  getTransferHistory,
  getTransferLimits,
}
