// 7iATLAS - API de Verificação de Cota
// Verifica se usuário pode comprar cota em determinado nível

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { matrixService } from '@/services/matrix.service'
import { DEMO_MODE, DEMO_TOKEN, demoQuotas, demoLevels, demoStats } from '@/lib/demo-data'

// GET /api/quotas/check?level=2
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    const { searchParams } = new URL(request.url)
    const levelNumber = parseInt(searchParams.get('level') || '1')

    // Modo Demo
    if (DEMO_MODE || token === DEMO_TOKEN) {
      const level = demoLevels.find(l => l.levelNumber === levelNumber)
      const quota = demoQuotas.find(q => q.level === levelNumber)
      const currentQuotas = quota?.count || 0
      const canPurchase = currentQuotas < 10 && demoStats.balance >= (level?.entryValue || 0)

      return NextResponse.json({
        levelNumber,
        canPurchase,
        reason: !canPurchase ? (currentQuotas >= 10 ? 'Máximo de 10 cotas por nível' : 'Saldo insuficiente') : undefined,
        entryValue: level?.entryValue || 0,
        currentQuotas,
      })
    }

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    if (levelNumber < 1 || levelNumber > 10) {
      return NextResponse.json({ error: 'Nível inválido (1-10)' }, { status: 400 })
    }

    const canPurchase = await matrixService.canPurchaseQuota(decoded.userId, levelNumber)
    const entryValue = matrixService.calculateLevelValue(levelNumber)
    const currentQuotas = await matrixService.countUserQuotas(decoded.userId, levelNumber)

    return NextResponse.json({
      levelNumber,
      canPurchase: canPurchase.canPurchase,
      reason: canPurchase.reason,
      entryValue,
      currentQuotas,
    })
  } catch (error: any) {
    console.error('Erro ao verificar cota:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
