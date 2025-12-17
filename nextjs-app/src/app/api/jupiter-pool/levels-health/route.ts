// 7iATLAS - Jupiter Pool Levels Health API
// Retorna a saúde de cada nível baseado em dados reais

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

    // Buscar estatísticas de cada nível
    const levels = await prisma.level.findMany({
      orderBy: { levelNumber: 'asc' },
      include: {
        stats: true,
        _count: {
          select: {
            queueEntries: {
              where: { status: 'WAITING' }
            }
          }
        }
      }
    })

    const now = new Date()

    const levelsHealth = levels.map(level => {
      const stats = level.stats
      const lastCycleAt = stats?.lastCycleAt

      // Calcular dias desde o último ciclo
      let daysSinceLastCycle = 0
      if (lastCycleAt) {
        const diffMs = now.getTime() - new Date(lastCycleAt).getTime()
        daysSinceLastCycle = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      } else {
        // Se nunca ciclou, considerar desde o firstCycleAt ou createdAt
        const startDate = stats?.firstCycleAt || level.createdAt
        const diffMs = now.getTime() - new Date(startDate).getTime()
        daysSinceLastCycle = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      }

      // Determinar status de saúde
      // < 3 dias = healthy, 3-5 = warning, > 5 = critical
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (daysSinceLastCycle >= 5) {
        status = 'critical'
      } else if (daysSinceLastCycle >= 3) {
        status = 'warning'
      }

      // Estimar valor de intervenção necessária
      // Se o nível está crítico, calcular quanto seria necessário para destravar
      const entryValue = Number(level.entryValue)
      const queueSize = level._count.queueEntries
      let estimatedIntervention = 0

      if (status === 'critical' && queueSize >= 7) {
        // Estimar injeção para processar pelo menos 1 ciclo
        // Isso seria o valor necessário para pagar as recompensas
        estimatedIntervention = entryValue * 7 // 7 posições x valor de entrada
      } else if (status === 'warning' && queueSize >= 7) {
        // Preparando mas ainda não intervenção
        estimatedIntervention = Math.round(entryValue * 3.5) // 50% do ciclo
      }

      return {
        level: level.levelNumber,
        entryValue,
        rewardValue: Number(level.rewardValue),
        daysSinceLastCycle,
        queueSize,
        totalCycles: level.totalCycles,
        avgWaitTime: stats?.avgWaitTime || 0,
        lastCycleAt: lastCycleAt?.toISOString() || null,
        status,
        estimatedIntervention,
        canProcess: queueSize >= 7
      }
    })

    // Calcular estatísticas gerais
    const totalCritical = levelsHealth.filter(l => l.status === 'critical').length
    const totalWarning = levelsHealth.filter(l => l.status === 'warning').length
    const totalHealthy = levelsHealth.filter(l => l.status === 'healthy').length
    const totalInterventionNeeded = levelsHealth.reduce((sum, l) => sum + l.estimatedIntervention, 0)

    return NextResponse.json({
      success: true,
      data: {
        levels: levelsHealth,
        summary: {
          totalLevels: 10,
          healthy: totalHealthy,
          warning: totalWarning,
          critical: totalCritical,
          totalInterventionNeeded,
          overallHealth: Math.round(((totalHealthy * 100) + (totalWarning * 50)) / 10)
        }
      }
    })
  } catch (error) {
    console.error('Erro ao buscar saúde dos níveis:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
