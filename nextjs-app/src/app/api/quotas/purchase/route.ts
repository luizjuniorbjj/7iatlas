// 7iATLAS - API de Compra de Cotas
// POST /api/quotas/purchase - Comprar cota(s) com saldo

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { TransactionType, TransactionStatus, QueueStatus, UserStatus } from '@prisma/client'
import { LEVEL_CONFIG } from '@/constants/levels'

const MAX_QUOTAS_PER_LEVEL = 10

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const userId = payload.userId
    const body = await request.json()
    const { level, quantity = 1 } = body

    // Validações básicas
    if (!level || level < 1 || level > 10) {
      return NextResponse.json({ error: 'Nível inválido (1-10)' }, { status: 400 })
    }

    if (quantity < 1 || quantity > MAX_QUOTAS_PER_LEVEL) {
      return NextResponse.json({
        error: `Quantidade inválida (1-${MAX_QUOTAS_PER_LEVEL})`
      }, { status: 400 })
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balance: true,
        status: true,
        currentLevel: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se usuário está ativo
    if (user.status !== UserStatus.ACTIVE) {
      return NextResponse.json({
        error: 'Usuário não está ativo. Ative sua conta primeiro.'
      }, { status: 400 })
    }

    // Calcular valor total
    const entryValue = LEVEL_CONFIG.ENTRY_VALUES[level - 1]
    const totalCost = entryValue * quantity

    // Verificar saldo
    if (Number(user.balance) < totalCost) {
      return NextResponse.json({
        error: 'Saldo insuficiente',
        required: totalCost,
        available: Number(user.balance),
        perQuota: entryValue,
      }, { status: 400 })
    }

    // Buscar cotas existentes do usuário neste nível
    const existingQuotas = await prisma.queueEntry.count({
      where: {
        userId,
        level: { levelNumber: level },
        status: { in: [QueueStatus.WAITING, QueueStatus.PROCESSING] },
      },
    })

    // Verificar limite de cotas
    if (existingQuotas + quantity > MAX_QUOTAS_PER_LEVEL) {
      return NextResponse.json({
        error: `Limite de cotas excedido`,
        currentQuotas: existingQuotas,
        maxQuotas: MAX_QUOTAS_PER_LEVEL,
        canBuy: MAX_QUOTAS_PER_LEVEL - existingQuotas,
      }, { status: 400 })
    }

    // Buscar o level
    const levelData = await prisma.level.findFirst({
      where: { levelNumber: level },
    })

    if (!levelData) {
      return NextResponse.json({ error: 'Nível não encontrado' }, { status: 404 })
    }

    // Transação atômica
    const result = await prisma.$transaction(async (tx) => {
      // 1. Debitar saldo do usuário
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: totalCost },
        },
      })

      // 2. Criar transação de compra
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.QUOTA_PURCHASE,
          amount: totalCost,
          status: TransactionStatus.CONFIRMED,
          description: `Compra de ${quantity} cota(s) - Nível ${level}`,
          confirmedAt: new Date(),
        },
      })

      // 3. Criar entradas na fila
      const queueEntries = []
      const baseScore = 1000 - (Date.now() / 1000000) // Score baseado no tempo

      for (let i = 0; i < quantity; i++) {
        const quotaNumber = existingQuotas + i + 1

        // Buscar posição atual na fila
        const currentQueueSize = await tx.queueEntry.count({
          where: {
            levelId: levelData.id,
            status: QueueStatus.WAITING,
          },
        })

        const entry = await tx.queueEntry.create({
          data: {
            userId,
            levelId: levelData.id,
            position: currentQueueSize + 1,
            score: baseScore - (i * 0.001), // Pequena diferença para manter ordem
            quotaNumber,
            reentries: 0,
            status: QueueStatus.WAITING,
          },
        })

        queueEntries.push(entry)
      }

      // 4. Atualizar estatísticas do nível
      await tx.level.update({
        where: { id: levelData.id },
        data: {
          totalUsers: { increment: quantity },
          cashBalance: { increment: totalCost },
        },
      })

      // 5. Atualizar nível atual do usuário (se comprou nível maior)
      if (level > user.currentLevel) {
        await tx.user.update({
          where: { id: userId },
          data: { currentLevel: level },
        })
      }

      return {
        transaction,
        queueEntries,
      }
    })

    return NextResponse.json({
      success: true,
      message: `${quantity} cota(s) comprada(s) com sucesso`,
      purchase: {
        level,
        quantity,
        totalCost,
        transactionId: result.transaction.id,
      },
      quotas: result.queueEntries.map(q => ({
        id: q.id,
        quotaNumber: q.quotaNumber,
        position: q.position,
      })),
      newBalance: Number(user.balance) - totalCost,
    })
  } catch (error) {
    console.error('Erro ao comprar cota:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET - Verificar disponibilidade para compra
export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const userId = payload.userId

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, status: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Buscar cotas por nível
    const quotasByLevel = await prisma.queueEntry.groupBy({
      by: ['levelId'],
      where: {
        userId,
        status: { in: [QueueStatus.WAITING, QueueStatus.PROCESSING] },
      },
      _count: { id: true },
    })

    // Buscar níveis
    const levels = await prisma.level.findMany({
      orderBy: { levelNumber: 'asc' },
    })

    const levelMap = new Map(quotasByLevel.map(q => [q.levelId, q._count.id]))

    // Montar disponibilidade por nível
    const availability = levels.map(level => {
      const currentQuotas = levelMap.get(level.id) || 0
      const entryValue = LEVEL_CONFIG.ENTRY_VALUES[level.levelNumber - 1]
      const canAfford = Number(user.balance) >= entryValue
      const hasSlots = currentQuotas < MAX_QUOTAS_PER_LEVEL

      return {
        level: level.levelNumber,
        entryValue,
        rewardValue: LEVEL_CONFIG.REWARD_VALUES[level.levelNumber - 1],
        currentQuotas,
        maxQuotas: MAX_QUOTAS_PER_LEVEL,
        availableSlots: MAX_QUOTAS_PER_LEVEL - currentQuotas,
        canAfford,
        canBuy: canAfford && hasSlots && user.status === UserStatus.ACTIVE,
        maxCanBuy: Math.min(
          MAX_QUOTAS_PER_LEVEL - currentQuotas,
          Math.floor(Number(user.balance) / entryValue)
        ),
      }
    })

    return NextResponse.json({
      balance: Number(user.balance),
      isActive: user.status === UserStatus.ACTIVE,
      levels: availability,
    })
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
