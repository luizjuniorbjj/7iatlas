// 7iATLAS - API de Estatísticas de Todos os Níveis
// Endpoint para visualizar estatísticas de todos os níveis

import { NextRequest, NextResponse } from 'next/server'
import { queueService } from '@/services/queue.service'
import { DEMO_MODE, demoLevels } from '@/lib/demo-data'

// GET /api/matrix/stats - Estatísticas de todos os níveis
export async function GET(request: NextRequest) {
  try {
    // Modo Demo
    if (DEMO_MODE) {
      const stats = demoLevels.map(level => ({
        levelNumber: level.levelNumber,
        entryValue: level.entryValue,
        rewardValue: level.rewardValue,
        bonusValue: level.bonusValue,
        cashBalance: level.cashBalance,
        totalCycles: level.totalCycles,
        totalInQueue: level.totalUsers,
        cyclesToday: Math.floor(Math.random() * 10),
        avgWaitTime: Math.floor(Math.random() * 12) + 1,
      }))

      const totals = {
        totalCycles: stats.reduce((sum, s) => sum + s.totalCycles, 0),
        totalInAllQueues: stats.reduce((sum, s) => sum + s.totalInQueue, 0),
        cyclesToday: stats.reduce((sum, s) => sum + s.cyclesToday, 0),
      }

      return NextResponse.json({ levels: stats, totals })
    }

    const stats = await queueService.getAllLevelsStats()

    // Calcula totais
    const totals = {
      totalCycles: stats.reduce((sum, s) => sum + s.totalCycles, 0),
      totalInAllQueues: stats.reduce((sum, s) => sum + s.totalInQueue, 0),
      cyclesToday: stats.reduce((sum, s) => sum + s.cyclesToday, 0),
    }

    return NextResponse.json({
      levels: stats,
      totals,
    })
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
