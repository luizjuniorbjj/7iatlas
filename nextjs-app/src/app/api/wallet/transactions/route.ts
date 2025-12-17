// 7iATLAS - API de Extrato/Transações
// GET /api/wallet/transactions - Retorna histórico completo de movimentações

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { TransactionType, TransactionStatus } from '@prisma/client'

// Mapeamento de tipos para exibição
const TYPE_LABELS: Record<TransactionType, { label: string; icon: string; color: string }> = {
  DEPOSIT: { label: 'Doação', icon: '💵', color: 'green' },
  CYCLE_REWARD: { label: 'Ciclo', icon: '🔄', color: 'green' },
  BONUS_REFERRAL: { label: 'Bônus Indicação', icon: '👥', color: 'green' },
  WITHDRAWAL: { label: 'Saque', icon: '📤', color: 'red' },
  INTERNAL_TRANSFER_IN: { label: 'Recebido', icon: '💸', color: 'green' },
  INTERNAL_TRANSFER_OUT: { label: 'Enviado', icon: '💸', color: 'red' },
  QUOTA_PURCHASE: { label: 'Compra Cota', icon: '🎫', color: 'red' },
  JUPITER_POOL_DEPOSIT: { label: 'Jupiter Pool Dep', icon: '🪐', color: 'blue' },
  JUPITER_POOL_WITHDRAWAL: { label: 'Jupiter Pool Saq', icon: '🪐', color: 'orange' },
}

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

    // Filtros
    const type = searchParams.get('type') // Tipo específico ou null para todos
    const period = searchParams.get('period') || 'all' // all, today, week, month
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const page = parseInt(searchParams.get('page') || '1')

    // Filtro de período
    let dateFilter: { gte?: Date } = {}
    const now = new Date()

    if (period === 'today') {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      dateFilter = { gte: startOfDay }
    } else if (period === 'week') {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - 7)
      startOfWeek.setHours(0, 0, 0, 0)
      dateFilter = { gte: startOfWeek }
    } else if (period === 'month') {
      const startOfMonth = new Date(now)
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      dateFilter = { gte: startOfMonth }
    }

    // Filtro de tipo
    let typeFilter: { type?: TransactionType | { in: TransactionType[] } } = {}
    if (type && type !== 'all') {
      if (type === 'receipts') {
        typeFilter = { type: { in: [TransactionType.CYCLE_REWARD, TransactionType.BONUS_REFERRAL, TransactionType.INTERNAL_TRANSFER_IN] } }
      } else if (type === 'expenses') {
        typeFilter = { type: { in: [TransactionType.WITHDRAWAL, TransactionType.INTERNAL_TRANSFER_OUT, TransactionType.QUOTA_PURCHASE] } }
      } else if (Object.values(TransactionType).includes(type as TransactionType)) {
        typeFilter = { type: type as TransactionType }
      }
    }

    // Buscar transações
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.CONFIRMED,
        ...typeFilter,
        ...(dateFilter.gte ? { confirmedAt: dateFilter } : {}),
      },
      orderBy: { confirmedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    })

    // Contar total para paginação
    const totalCount = await prisma.transaction.count({
      where: {
        userId,
        status: TransactionStatus.CONFIRMED,
        ...typeFilter,
        ...(dateFilter.gte ? { confirmedAt: dateFilter } : {}),
      },
    })

    // Buscar saldo atual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    })

    // Calcular saldo em cada transação (simulado - do mais recente para trás)
    let runningBalance = Number(user?.balance || 0)
    const transactionsWithBalance = transactions.map(tx => {
      const meta = TYPE_LABELS[tx.type]
      const amount = Number(tx.amount)
      const isCredit = ['DEPOSIT', 'CYCLE_REWARD', 'BONUS_REFERRAL', 'INTERNAL_TRANSFER_IN'].includes(tx.type)

      const balanceAfter = runningBalance
      runningBalance = isCredit ? runningBalance - amount : runningBalance + amount

      return {
        id: tx.id,
        type: tx.type,
        typeLabel: meta.label,
        icon: meta.icon,
        color: meta.color,
        amount: isCredit ? amount : -amount,
        description: tx.description,
        balanceAfter,
        date: tx.confirmedAt,
        createdAt: tx.createdAt,
      }
    })

    // Agrupar por data
    const groupedByDate: Record<string, typeof transactionsWithBalance> = {}
    transactionsWithBalance.forEach(tx => {
      const dateKey = tx.date ? new Date(tx.date).toISOString().split('T')[0] : 'pending'
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(tx)
    })

    return NextResponse.json({
      transactions: transactionsWithBalance,
      grouped: groupedByDate,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
      currentBalance: Number(user?.balance || 0),
    })
  } catch (error) {
    console.error('Erro ao buscar transações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
