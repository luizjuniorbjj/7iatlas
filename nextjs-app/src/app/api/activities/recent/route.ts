// 7iATLAS - Recent Activities API
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
    const limit = parseInt(searchParams.get('limit') || '10')

    // Busca transações recentes do usuário
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: payload.userId,
        status: 'CONFIRMED'
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Busca indicados recentes
    const recentReferrals = await prisma.user.findMany({
      where: {
        referrerId: payload.userId
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true
      }
    })

    // Combina e formata as atividades
    const activities = [
      ...transactions.map(tx => ({
        id: tx.id,
        type: getActivityType(tx.type),
        title: getActivityTitle(tx.type, tx.description),
        amount: tx.type === 'WITHDRAWAL' ? undefined : tx.amount,
        timestamp: tx.createdAt,
        status: tx.status
      })),
      ...recentReferrals.map(ref => ({
        id: ref.id,
        type: 'referral' as const,
        title: `Novo indicado - ${ref.name || 'Usuário'}`,
        timestamp: ref.createdAt,
        status: ref.status === 'ACTIVE' ? 'Ativo' : 'Pendente'
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      data: activities
    })
  } catch (error) {
    console.error('Erro ao buscar atividades:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

function getActivityType(txType: string): 'cycle' | 'bonus' | 'referral' | 'transfer' {
  switch (txType) {
    case 'CYCLE_REWARD':
      return 'cycle'
    case 'BONUS_REFERRAL':
      return 'bonus'
    case 'TRANSFER_IN':
    case 'TRANSFER_OUT':
      return 'transfer'
    default:
      return 'cycle'
  }
}

function getActivityTitle(txType: string, description?: string | null): string {
  if (description) return description

  switch (txType) {
    case 'CYCLE_REWARD':
      return 'Ciclo Completado'
    case 'BONUS_REFERRAL':
      return 'Bônus de Indicação'
    case 'DEPOSIT':
      return 'Depósito Confirmado'
    case 'WITHDRAWAL':
      return 'Saque Realizado'
    case 'TRANSFER_IN':
      return 'Transferência Recebida'
    case 'TRANSFER_OUT':
      return 'Transferência Enviada'
    default:
      return 'Transação'
  }
}
