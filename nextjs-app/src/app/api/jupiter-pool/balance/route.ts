// 7iATLAS - Jupiter Pool Balance API
// O Jupiter Pool é alimentado por 10% de cada ciclo completado
// Serve como reserva de segurança para injetar em níveis travados

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { LEVEL_CONFIG } from '@/constants/levels'

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

    // Calcular Jupiter Pool baseado nos ciclos completados
    // 10% de cada recompensa de ciclo vai para o pool

    // Busca todos os níveis com seus totais de ciclos
    const levels = await prisma.level.findMany({
      select: {
        levelNumber: true,
        totalCycles: true,
        rewardValue: true,
      }
    })

    // Calcular total depositado no pool (10% de cada ciclo)
    let totalDeposits = 0
    levels.forEach(level => {
      const rewardValue = Number(level.rewardValue)
      const contribution = rewardValue * 0.10 // 10% do reward
      totalDeposits += level.totalCycles * contribution
    })

    // Estimar depósitos de hoje baseado nas stats dos níveis
    // (simplificado - usa cyclesToday se disponível)
    let todayDepositsAmount = 0
    try {
      const levelStats = await prisma.levelStats.findMany({
        include: { level: { select: { rewardValue: true } } }
      })
      levelStats.forEach(stat => {
        const rewardValue = Number(stat.level.rewardValue)
        todayDepositsAmount += (stat.cyclesToday || 0) * rewardValue * 0.10
      })
    } catch {
      // Ignora se não houver stats
    }

    // Buscar transações de injeção do Jupiter Pool
    const jupiterPoolWithdrawals = await prisma.transaction.aggregate({
      where: { type: 'JUPITER_POOL_WITHDRAWAL', status: 'CONFIRMED' },
      _sum: { amount: true }
    })
    const totalWithdrawals = Number(jupiterPoolWithdrawals._sum?.amount || 0)

    // Injeções de hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayWithdrawalsData = await prisma.transaction.aggregate({
      where: {
        type: 'JUPITER_POOL_WITHDRAWAL',
        status: 'CONFIRMED',
        createdAt: { gte: today }
      },
      _sum: { amount: true }
    })
    const todayWithdrawalsAmount = Number(todayWithdrawalsData._sum?.amount || 0)

    const balance = totalDeposits - totalWithdrawals

    return NextResponse.json({
      success: true,
      data: {
        balance: Number(balance.toFixed(2)),
        totalDeposits: Number(totalDeposits.toFixed(2)),
        totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
        todayDeposits: Number(todayDepositsAmount.toFixed(2)),
        todayWithdrawals: Number(todayWithdrawalsAmount.toFixed(2))
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
