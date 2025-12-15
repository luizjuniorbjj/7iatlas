// 7iATLAS - Referrals API
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
    const skip = (page - 1) * limit

    // Busca dados do usuário atual
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { referralCode: true }
    })

    // Conta total de indicados
    const total = await prisma.user.count({
      where: { referrerId: payload.userId }
    })

    // Busca indicados paginados
    const referrals = await prisma.user.findMany({
      where: { referrerId: payload.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        walletAddress: true,
        status: true,
        currentLevel: true,
        createdAt: true,
        activatedAt: true
      }
    })

    // Calcula bônus total recebido de cada indicado
    const referralsWithBonus = await Promise.all(
      referrals.map(async (ref) => {
        const bonusTotal = await prisma.transaction.aggregate({
          where: {
            userId: payload.userId,
            type: 'BONUS_REFERRAL',
            description: { contains: ref.id },
            status: 'CONFIRMED'
          },
          _sum: { amount: true }
        })

        return {
          ...ref,
          totalBonus: bonusTotal._sum.amount || 0
        }
      })
    )

    // Estatísticas gerais
    const stats = {
      total,
      active: await prisma.user.count({
        where: { referrerId: payload.userId, status: 'ACTIVE' }
      }),
      pending: await prisma.user.count({
        where: { referrerId: payload.userId, status: 'PENDING' }
      }),
      totalBonus: await prisma.transaction.aggregate({
        where: {
          userId: payload.userId,
          type: 'BONUS_REFERRAL',
          status: 'CONFIRMED'
        },
        _sum: { amount: true }
      }).then(r => r._sum.amount || 0)
    }

    // Calcula tier de bônus
    const bonusTier = getBonusTier(stats.active)

    return NextResponse.json({
      success: true,
      data: {
        referralCode: user?.referralCode,
        referralLink: `https://7iatlas.ai/ref/${user?.referralCode}`,
        stats,
        bonusTier,
        referrals: referralsWithBonus,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Erro ao buscar indicados:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

function getBonusTier(activeReferrals: number): { percent: number; label: string; nextTier?: { needed: number; percent: number } } {
  if (activeReferrals >= 10) {
    return { percent: 40, label: '40%' }
  } else if (activeReferrals >= 5) {
    return {
      percent: 20,
      label: '20%',
      nextTier: { needed: 10 - activeReferrals, percent: 40 }
    }
  }
  return {
    percent: 0,
    label: '0%',
    nextTier: { needed: 5 - activeReferrals, percent: 20 }
  }
}
