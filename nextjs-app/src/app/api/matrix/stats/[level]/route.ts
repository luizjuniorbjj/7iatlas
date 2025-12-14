// 7iATLAS - API de Estatísticas da Matriz
// Endpoint para visualizar estatísticas de um nível

import { NextRequest, NextResponse } from 'next/server'
import { queueService } from '@/services/queue.service'

// GET /api/matrix/stats/[level] - Estatísticas do nível
export async function GET(
  request: NextRequest,
  { params }: { params: { level: string } }
) {
  try {
    const levelNumber = parseInt(params.level)
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 10) {
      return NextResponse.json({ error: 'Nível inválido (1-10)' }, { status: 400 })
    }

    const stats = await queueService.getLevelStats(levelNumber)

    if (!stats) {
      return NextResponse.json({ error: 'Nível não encontrado' }, { status: 404 })
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
