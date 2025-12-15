// 7iATLAS - Jupiter Pool Balance API
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

    // Busca estatísticas do Jupiter Pool
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Busca saldo total do Jupiter Pool (soma de todas as entradas - saídas)
    const deposits = await prisma.transaction.aggregate({
      where: {
        type: 'JUPITER_POOL_DEPOSIT',
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    })

    const withdrawals = await prisma.transaction.aggregate({
      where: {
        type: 'JUPITER_POOL_WITHDRAWAL',
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    })

    // Depósitos de hoje
    const todayDeposits = await prisma.transaction.aggregate({
      where: {
        type: 'JUPITER_POOL_DEPOSIT',
        status: 'CONFIRMED',
        createdAt: { gte: today }
      },
      _sum: { amount: true }
    })

    // Saques de hoje (injeções em níveis)
    const todayWithdrawals = await prisma.transaction.aggregate({
      where: {
        type: 'JUPITER_POOL_WITHDRAWAL',
        status: 'CONFIRMED',
        createdAt: { gte: today }
      },
      _sum: { amount: true }
    })

    const balance = (deposits._sum.amount || 0) - (withdrawals._sum.amount || 0)

    return NextResponse.json({
      success: true,
      data: {
        balance: Number(balance.toFixed(2)),
        totalDeposits: Number((deposits._sum.amount || 0).toFixed(2)),
        totalWithdrawals: Number((withdrawals._sum.amount || 0).toFixed(2)),
        todayDeposits: Number((todayDeposits._sum.amount || 0).toFixed(2)),
        todayWithdrawals: Number((todayWithdrawals._sum.amount || 0).toFixed(2))
      }
    })
  } catch (error) {
    console.error('Erro ao buscar Jupiter Pool:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
