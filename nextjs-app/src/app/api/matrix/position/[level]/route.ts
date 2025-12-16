// 7iATLAS - API de Posição na Matriz
// Endpoint para visualizar posição do usuário na fila

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { queueService } from '@/services/queue.service'

// GET /api/matrix/position/[level] - Posição do usuário no nível
export async function GET(
  request: NextRequest,
  { params }: { params: { level: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const levelNumber = parseInt(params.level)
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 10) {
      return NextResponse.json({ error: 'Nível inválido (1-10)' }, { status: 400 })
    }

    // Busca todas as posições do usuário (múltiplas cotas)
    const positions = await queueService.getAllUserPositions(decoded.userId, levelNumber)

    if (positions.length === 0) {
      return NextResponse.json({
        hasPosition: false,
        message: 'Você não tem cotas neste nível',
      })
    }

    // Retorna a primeira posição como principal e todas como lista
    const mainPosition = positions[0]

    return NextResponse.json({
      hasPosition: true,
      position: mainPosition.position,
      totalInQueue: mainPosition.totalInQueue,
      percentile: mainPosition.percentile,
      estimatedWait: mainPosition.estimatedWait,
      score: mainPosition.score,
      enteredAt: mainPosition.enteredAt,
      reentries: mainPosition.reentries,
      quotaNumber: mainPosition.quotaNumber,
      // Dados de ciclos e ganhos
      cyclesCompleted: mainPosition.cyclesCompleted,
      totalEarned: mainPosition.totalEarned,
      // Todas as cotas
      allQuotas: positions,
      totalQuotas: positions.length,
    })
  } catch (error: any) {
    console.error('Erro ao buscar posição:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
