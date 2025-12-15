// 7iATLAS - History API (All transactions)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') // DEPOSIT, CYCLE_REWARD, BONUS_REFERRAL, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT
    const skip = (page - 1) * limit

    // Filtro por tipo
    const where: any = { userId: payload.userId }
    if (type) {
      where.type = type
    }

    // Conta total
    const total = await prisma.transaction.count({ where })

    // Busca transações paginadas
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    // Estatísticas gerais
    const stats = {
      totalDeposits: await prisma.transaction.aggregate({
        where: { userId: payload.userId, type: 'DEPOSIT', status: 'CONFIRMED' },
        _sum: { amount: true }
      }).then(r => r._sum.amount || 0),

      totalCycleRewards: await prisma.transaction.aggregate({
        where: { userId: payload.userId, type: 'CYCLE_REWARD', status: 'CONFIRMED' },
        _sum: { amount: true }
      }).then(r => r._sum.amount || 0),

      totalBonus: await prisma.transaction.aggregate({
        where: { userId: payload.userId, type: 'BONUS_REFERRAL', status: 'CONFIRMED' },
        _sum: { amount: true }
      }).then(r => r._sum.amount || 0),

      totalWithdrawals: await prisma.transaction.aggregate({
        where: { userId: payload.userId, type: 'WITHDRAWAL', status: 'CONFIRMED' },
        _sum: { amount: true }
      }).then(r => r._sum.amount || 0),

      totalTransfersIn: await prisma.transaction.aggregate({
        where: { userId: payload.userId, type: 'TRANSFER_IN', status: 'CONFIRMED' },
        _sum: { amount: true }
      }).then(r => r._sum.amount || 0),

      totalTransfersOut: await prisma.transaction.aggregate({
        where: { userId: payload.userId, type: 'TRANSFER_OUT', status: 'CONFIRMED' },
        _sum: { amount: true }
      }).then(r => r._sum.amount || 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          status: tx.status,
          description: tx.description,
          txHash: tx.txHash,
          createdAt: tx.createdAt,
          confirmedAt: tx.confirmedAt
        })),
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
