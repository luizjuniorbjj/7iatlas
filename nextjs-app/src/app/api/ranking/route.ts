// 7iATLAS - Ranking API
// GET /api/ranking - Get leaderboard with optional sorting

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token nao fornecido' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sort') || 'received'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100)

    // Build order clause based on sort parameter
    // Campos corretos do schema: totalEarned, totalBonus, currentLevel
    let orderBy: any = { totalEarned: 'desc' }
    if (sortBy === 'cycles' || sortBy === 'bonus') {
      orderBy = { totalBonus: 'desc' }
    } else if (sortBy === 'level') {
      orderBy = { currentLevel: 'desc' }
    }

    // Fetch users with ranking data
    // Nota: totalCycles não existe no User, calculamos via Quota
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { totalEarned: { gt: 0 } },
          { totalBonus: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        name: true,
        referralCode: true,
        totalEarned: true,
        totalBonus: true,
        currentLevel: true,
        _count: {
          select: {
            queueEntries: true
          }
        }
      },
      orderBy,
      take: limit,
    })

    // Build ranking with position
    const ranking = users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      name: user.name || 'Explorador',
      code: user.referralCode,
      totalReceived: Number(user.totalEarned) || 0,
      totalBonus: Number(user.totalBonus) || 0,
      totalQuotas: user._count?.queueEntries || 0,
      currentLevel: user.currentLevel || 1,
      isCurrentUser: user.id === decoded.userId,
    }))

    // Find current user position
    const currentUserIndex = ranking.findIndex(u => u.isCurrentUser)
    let currentUser = null

    if (currentUserIndex >= 0) {
      currentUser = ranking[currentUserIndex]
    } else {
      // User not in ranking yet, fetch their data
      const userData = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          referralCode: true,
          totalEarned: true,
          totalBonus: true,
          currentLevel: true,
          _count: {
            select: {
              queueEntries: true
            }
          }
        },
      })

      if (userData) {
        // Count users above this one to determine rank
        let whereClause: any = { totalEarned: { gt: Number(userData.totalEarned) || 0 } }
        if (sortBy === 'cycles' || sortBy === 'bonus') {
          whereClause = { totalBonus: { gt: Number(userData.totalBonus) || 0 } }
        } else if (sortBy === 'level') {
          whereClause = { currentLevel: { gt: userData.currentLevel || 1 } }
        }

        const usersAbove = await prisma.user.count({ where: whereClause })

        currentUser = {
          rank: usersAbove + 1,
          userId: userData.id,
          name: userData.name || 'Explorador',
          code: userData.referralCode,
          totalReceived: Number(userData.totalEarned) || 0,
          totalBonus: Number(userData.totalBonus) || 0,
          totalQuotas: userData._count?.queueEntries || 0,
          currentLevel: userData.currentLevel || 1,
          isCurrentUser: true,
        }
      }
    }

    return NextResponse.json({
      ranking,
      currentUser,
      total: users.length,
      sortBy,
    })
  } catch (error: any) {
    console.error('Erro ao buscar ranking:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
