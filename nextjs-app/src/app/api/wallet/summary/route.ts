// 7iATLAS - API de Resumo Financeiro
// GET /api/wallet/summary - Retorna resumo completo (doado, recebido, IEC, etc)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { TransactionType, TransactionStatus } from '@prisma/client'

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

    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        totalDeposited: true,
        totalEarned: true,
        totalBonus: true,
        totalWithdrawn: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Buscar total investido em cotas
    const quotasPurchased = await prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.QUOTA_PURCHASE,
        status: TransactionStatus.CONFIRMED,
      },
      _sum: { amount: true },
    })

    // Buscar recebimentos do mês atual
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlyReceipts = await prisma.transaction.aggregate({
      where: {
        userId,
        type: { in: [TransactionType.CYCLE_REWARD, TransactionType.BONUS_REFERRAL] },
        status: TransactionStatus.CONFIRMED,
        confirmedAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    })

    // Contar ciclos completados
    const totalCyclesCompleted = await prisma.cycleHistory.count({
      where: {
        userId,
        position: 'RECEIVER',
        status: TransactionStatus.CONFIRMED,
      },
    })

    // Calcular valores
    const totalDonated = Number(user.totalDeposited)
    const totalReceivedCycles = Number(user.totalEarned)
    const totalReceivedBonus = Number(user.totalBonus)
    const totalReceived = totalReceivedCycles + totalReceivedBonus
    const totalInvested = Number(quotasPurchased._sum.amount || 0)
    const monthlyTotal = Number(monthlyReceipts._sum.amount || 0)

    // IEC (Índice de Execução de Ciclos) = (Total Recebido / Total Investido) * 100
    // Se não investiu nada, IEC = 0
    const iec = totalInvested > 0 ? ((totalReceived / totalInvested) * 100) : 0

    return NextResponse.json({
      balance: Number(user.balance),

      // Resumo geral
      totalDonated,           // Total doado para o sistema
      totalReceived,          // Total recebido (ciclos + bônus)
      totalReceivedCycles,    // Apenas ciclos
      totalReceivedBonus,     // Apenas bônus
      totalInvested,          // Total investido em cotas
      totalWithdrawn: Number(user.totalWithdrawn),

      // Métricas
      iec: Math.round(iec * 100) / 100,  // IEC com 2 casas decimais
      totalCyclesCompleted,

      // Resumo do mês
      monthlyReceived: monthlyTotal,
    })
  } catch (error) {
    console.error('Erro ao buscar resumo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
