// 7iATLAS - API de Lista da Fila
// Endpoint para visualizar fila completa de um nível

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { queueService } from '@/services/queue.service'

// GET /api/matrix/queue/[level] - Lista da fila paginada
export async function GET(
  request: NextRequest,
  { params }: { params: { level: string } }
) {
  try {
    const levelNumber = parseInt(params.level)
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 10) {
      return NextResponse.json({ error: 'Nível inválido (1-10)' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50) // Max 50
    const search = searchParams.get('search') || undefined
    const highlight = searchParams.get('highlight') === 'true'

    // Tenta pegar usuário autenticado (opcional)
    let currentUserId: string | undefined
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token && highlight) {
      const decoded = verifyToken(token)
      if (decoded) {
        currentUserId = decoded.userId
      }
    }

    const result = await queueService.getQueueList(
      levelNumber,
      page,
      limit,
      currentUserId,
      search
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Erro ao listar fila:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
