import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { DEMO_MODE, DEMO_TOKEN, demoLevels, demoQuotas } from '@/lib/demo-data'

function getTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.substring(7)
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request)

    // Modo Demo
    if (DEMO_MODE || token === DEMO_TOKEN) {
      const queuesInfo = demoLevels.map((level) => {
        const userQuota = demoQuotas.find(q => q.level === level.levelNumber)
        const userEntry = userQuota?.quotas.find(q => q.status === 'WAITING')

        return {
          level: level.levelNumber,
          entryValue: level.entryValue,
          rewardValue: level.rewardValue,
          bonusValue: level.bonusValue,
          cashBalance: level.cashBalance,
          totalCycles: level.totalCycles,
          totalInQueue: level.totalUsers,
          canProcess: level.totalUsers >= 7 && level.cashBalance >= level.entryValue * 7,
          userPosition: userEntry ? Math.floor(Math.random() * 50) + 10 : null,
          userScore: userEntry ? userEntry.score : null,
          estimatedTime: userEntry ? `~${Math.floor(Math.random() * 24) + 1}h` : null,
        }
      })

      return NextResponse.json({
        success: true,
        data: queuesInfo,
      })
    }

    let userId: string | null = null

    if (token) {
      const payload = verifyToken(token)
      if (payload) userId = payload.userId
    }

    // Busca todos os níveis com estatísticas
    const levels = await prisma.level.findMany({
      orderBy: { levelNumber: 'asc' },
    })

    const queuesInfo = await Promise.all(
      levels.map(async (level) => {
        // Total na fila
        const totalInQueue = await prisma.queueEntry.count({
          where: {
            levelId: level.id,
            status: 'WAITING',
          },
        })

        // Posição do usuário (se logado)
        let userPosition = null
        let userEntry = null

        if (userId) {
          userEntry = await prisma.queueEntry.findFirst({
            where: {
              userId,
              levelId: level.id,
              status: 'WAITING',
            },
          })

          if (userEntry) {
            const entriesAhead = await prisma.queueEntry.count({
              where: {
                levelId: level.id,
                status: 'WAITING',
                score: { gt: userEntry.score },
              },
            })
            userPosition = entriesAhead + 1
          }
        }

        // Estima tempo para ciclar (baseado em média de ciclos por hora)
        let estimatedTime = null
        if (userPosition && totalInQueue >= 7) {
          const hoursPerCycle = 2 // Estimativa: 1 ciclo a cada 2 horas
          const cyclesNeeded = Math.ceil(userPosition / 7)
          const estimatedHours = cyclesNeeded * hoursPerCycle

          if (estimatedHours < 24) {
            estimatedTime = `~${estimatedHours}h`
          } else {
            const days = Math.ceil(estimatedHours / 24)
            estimatedTime = `~${days} dia${days > 1 ? 's' : ''}`
          }
        }

        return {
          level: level.levelNumber,
          entryValue: Number(level.entryValue),
          rewardValue: Number(level.rewardValue),
          bonusValue: Number(level.bonusValue),
          cashBalance: Number(level.cashBalance),
          totalCycles: level.totalCycles,
          totalInQueue,
          canProcess: totalInQueue >= 7 && Number(level.cashBalance) >= Number(level.entryValue) * 7,
          userPosition,
          userScore: userEntry ? Number(userEntry.score) : null,
          estimatedTime,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: queuesInfo,
    })
  } catch (error) {
    console.error('Erro ao buscar filas:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
