// 7iATLAS - API para encontrar página do usuário
// Endpoint para localizar em qual página da fila o usuário está

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { queueService } from '@/services/queue.service'

// GET /api/matrix/queue/[level]/find-me - Encontra página do usuário
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const result = await queueService.findUserPage(decoded.userId, levelNumber, limit)

    if (!result) {
      return NextResponse.json({
        found: false,
        message: 'Você não está na fila deste nível',
      })
    }

    return NextResponse.json({
      found: true,
      position: result.position,
      page: result.page,
      limit,
    })
  } catch (error: any) {
    console.error('Erro ao encontrar usuário:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
