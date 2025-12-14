// 7iATLAS - API de Estatísticas de Todos os Níveis
// Endpoint para visualizar estatísticas de todos os níveis

import { NextRequest, NextResponse } from 'next/server'
import { queueService } from '@/services/queue.service'

// GET /api/matrix/stats - Estatísticas de todos os níveis
export async function GET(request: NextRequest) {
  try {
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
