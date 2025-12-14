// API Route para atualização periódica de scores da fila
// Este endpoint deve ser chamado por um cron job (ex: Vercel Cron, Railway Cron)
// Frequência recomendada: a cada 1-5 minutos dependendo do volume

import { NextResponse } from 'next/server'
import { matrixService } from '@/services/matrix.service'

// Chave secreta para proteger o endpoint (configurar em .env)
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  // Verifica autenticação do cron job
  const authHeader = request.headers.get('authorization')

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const startTime = Date.now()

    // Atualiza scores de todos os níveis
    await matrixService.updateAllQueueScores()

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Scores atualizados com sucesso',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erro ao atualizar scores:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao atualizar scores',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// POST também aceito para compatibilidade com diferentes cron services
export async function POST(request: Request) {
  return GET(request)
}
