// API Route para processamento automático de ciclos
// Este endpoint deve ser chamado por um cron job (ex: Vercel Cron, Railway Cron)
// Frequência recomendada: a cada 30 segundos a 1 minuto

import { NextResponse } from 'next/server'
import { matrixService } from '@/services/matrix.service'

// Chave secreta para proteger o endpoint (configurar em .env)
const CRON_SECRET = process.env.CRON_SECRET

// Número máximo de ciclos por execução (evita timeout)
const MAX_CYCLES_PER_RUN = 50

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
    const results: { level: number; success: boolean; error?: string }[] = []
    let totalCycles = 0

    // Processa ciclos para cada nível (1-10)
    for (let level = 1; level <= 10 && totalCycles < MAX_CYCLES_PER_RUN; level++) {
      // Verifica se pode processar ciclo neste nível
      const canProcess = await matrixService.canProcessCycle(level)

      if (canProcess) {
        try {
          // Processa o ciclo
          await matrixService.processCycle(level)
          results.push({ level, success: true })
          totalCycles++

          // Verifica se ainda há mais ciclos para processar neste nível
          let moreToProcess = await matrixService.canProcessCycle(level)
          while (moreToProcess && totalCycles < MAX_CYCLES_PER_RUN) {
            await matrixService.processCycle(level)
            results.push({ level, success: true })
            totalCycles++
            moreToProcess = await matrixService.canProcessCycle(level)
          }
        } catch (error) {
          results.push({
            level,
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          })
        }
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: `${totalCycles} ciclo(s) processado(s)`,
      cyclesProcessed: totalCycles,
      results,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erro ao processar ciclos:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao processar ciclos',
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
