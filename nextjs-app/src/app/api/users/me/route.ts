import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Helper para extrair token do header
function getTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.substring(7)
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        referrer: {
          select: {
            id: true,
            name: true,
            referralCode: true,
          },
        },
        _count: {
          select: {
            referrals: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Busca posição na fila do nível atual
    const queueEntry = await prisma.queueEntry.findFirst({
      where: {
        userId: user.id,
        status: 'WAITING',
      },
      include: {
        level: true,
      },
      orderBy: {
        level: {
          levelNumber: 'desc',
        },
      },
    })

    // Conta total na fila do nível atual
    let queuePosition = 0
    let totalInQueue = 0

    if (queueEntry) {
      const entriesAhead = await prisma.queueEntry.count({
        where: {
          levelId: queueEntry.levelId,
          status: 'WAITING',
          score: { gt: queueEntry.score },
        },
      })
      queuePosition = entriesAhead + 1

      totalInQueue = await prisma.queueEntry.count({
        where: {
          levelId: queueEntry.levelId,
          status: 'WAITING',
        },
      })
    }

    // Conta ciclos completados
    const cyclesCompleted = await prisma.cycleHistory.count({
      where: {
        userId: user.id,
        position: 'RECEIVER',
        status: 'CONFIRMED',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
          name: user.name,
          referralCode: user.referralCode,
          status: user.status,
          currentLevel: user.currentLevel,
          createdAt: user.createdAt,
          activatedAt: user.activatedAt,
        },
        stats: {
          balance: Number(user.totalEarned) + Number(user.totalBonus) - Number(user.totalWithdrawn),
          totalEarned: Number(user.totalEarned),
          totalBonus: Number(user.totalBonus),
          totalDeposited: Number(user.totalDeposited),
          totalWithdrawn: Number(user.totalWithdrawn),
          referralsCount: user._count.referrals,
          cyclesCompleted,
          queuePosition,
          totalInQueue,
        },
        referrer: user.referrer,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email } = body

    // Verifica se email já existe
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: payload.userId },
        },
      })

      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'Este email já está em uso' },
          { status: 400 }
        )
      }
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        name: name || undefined,
        email: email?.toLowerCase() || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        name: user.name,
      },
      message: 'Perfil atualizado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
