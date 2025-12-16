// 7iATLAS - API de Recebimentos
// GET /api/wallet/receipts - Retorna recebimentos detalhados (ciclos + bônus)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { TransactionType, TransactionStatus, CyclePosition } from '@prisma/client'
import { LEVEL_CONFIG } from '@/constants/levels'

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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, cycles, bonus
    const period = searchParams.get('period') || 'all' // all, month, week
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    // Filtro de período
    let dateFilter: { gte?: Date } = {}
    if (period === 'month') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      dateFilter = { gte: startOfMonth }
    } else if (period === 'week') {
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - 7)
      startOfWeek.setHours(0, 0, 0, 0)
      dateFilter = { gte: startOfWeek }
    }

    // Recebimentos por Ciclos (agrupados por nível)
    const cyclesByLevel = await prisma.cycleHistory.groupBy({
      by: ['levelId'],
      where: {
        userId,
        position: CyclePosition.RECEIVER,
        status: TransactionStatus.CONFIRMED,
        ...(dateFilter.gte ? { confirmedAt: dateFilter } : {}),
      },
      _count: { id: true },
      _sum: { amount: true },
      _max: { confirmedAt: true },
    })

    // Buscar níveis para mapear
    const levels = await prisma.level.findMany({
      select: { id: true, levelNumber: true },
    })
    const levelMap = new Map(levels.map(l => [l.id, l.levelNumber]))

    // Formatar recebimentos por ciclo
    const cycleReceipts = cyclesByLevel.map(c => ({
      level: levelMap.get(c.levelId) || 0,
      cycles: c._count.id,
      valuePerCycle: LEVEL_CONFIG.REWARD_VALUES[(levelMap.get(c.levelId) || 1) - 1],
      total: Number(c._sum.amount || 0),
      lastReceived: c._max.confirmedAt,
    })).sort((a, b) => a.level - b.level)

    // Total de ciclos
    const totalCycles = cycleReceipts.reduce((sum, c) => sum + c.cycles, 0)
    const totalFromCycles = cycleReceipts.reduce((sum, c) => sum + c.total, 0)

    // Recebimentos por Bônus de Indicação
    const bonusTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.BONUS_REFERRAL,
        status: TransactionStatus.CONFIRMED,
        ...(dateFilter.gte ? { confirmedAt: dateFilter } : {}),
      },
      orderBy: { confirmedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        amount: true,
        description: true,
        confirmedAt: true,
      },
    })

    const totalFromBonus = await prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.BONUS_REFERRAL,
        status: TransactionStatus.CONFIRMED,
        ...(dateFilter.gte ? { confirmedAt: dateFilter } : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
    })

    // Últimos recebimentos de ciclo (timeline)
    const recentCycleReceipts = await prisma.cycleHistory.findMany({
      where: {
        userId,
        position: CyclePosition.RECEIVER,
        status: TransactionStatus.CONFIRMED,
        ...(dateFilter.gte ? { confirmedAt: dateFilter } : {}),
      },
      orderBy: { confirmedAt: 'desc' },
      take: limit,
      include: {
        level: { select: { levelNumber: true } },
      },
    })

    return NextResponse.json({
      // Resumo
      summary: {
        totalReceived: totalFromCycles + Number(totalFromBonus._sum.amount || 0),
        totalFromCycles,
        totalFromBonus: Number(totalFromBonus._sum.amount || 0),
        totalCyclesCompleted: totalCycles,
        totalBonusReceived: totalFromBonus._count.id,
      },

      // Recebimentos por ciclos (agrupados por nível)
      cyclesByLevel: cycleReceipts,

      // Recebimentos de bônus (lista)
      bonusReceipts: bonusTransactions.map(b => ({
        id: b.id,
        amount: Number(b.amount),
        description: b.description,
        receivedAt: b.confirmedAt,
      })),

      // Timeline de ciclos recentes
      recentCycles: recentCycleReceipts.map(c => ({
        id: c.id,
        level: c.level.levelNumber,
        amount: Number(c.amount),
        receivedAt: c.confirmedAt,
      })),

      // Paginação
      pagination: {
        page,
        limit,
        hasMore: bonusTransactions.length === limit,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar recebimentos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
