// 7iATLAS - API de Cotas
// Endpoints para compra e gerenciamento de cotas

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { matrixService } from '@/services/matrix.service'

// GET /api/quotas - Lista todas as cotas do usuário
export async function GET(request: NextRequest) {
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

    const quotas = await matrixService.getAllUserQuotas(decoded.userId)

    // Agrupa por nível
    const quotasByLevel: Record<number, any[]> = {}
    for (const quota of quotas) {
      const levelNumber = quota.level.levelNumber
      if (!quotasByLevel[levelNumber]) {
        quotasByLevel[levelNumber] = []
      }
      quotasByLevel[levelNumber].push({
        id: quota.id,
        quotaNumber: quota.quotaNumber,
        status: quota.status,
        score: quota.score,
        reentries: quota.reentries,
        enteredAt: quota.enteredAt,
        processedAt: quota.processedAt,
      })
    }

    return NextResponse.json({
      quotas: quotasByLevel,
      totalQuotas: quotas.length,
      activeQuotas: quotas.filter(q => q.status === 'WAITING').length,
    })
  } catch (error: any) {
    console.error('Erro ao listar cotas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/quotas - Compra nova cota
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { levelNumber, txHash } = body

    if (!levelNumber || levelNumber < 1 || levelNumber > 10) {
      return NextResponse.json({ error: 'Nível inválido (1-10)' }, { status: 400 })
    }

    // Verifica se pode comprar
    const canPurchase = await matrixService.canPurchaseQuota(decoded.userId, levelNumber)
    if (!canPurchase.canPurchase) {
      return NextResponse.json({ error: canPurchase.reason }, { status: 400 })
    }

    // Compra a cota
    const result = await matrixService.purchaseQuota(decoded.userId, levelNumber, txHash)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      quotaId: result.quotaId,
      quotaNumber: result.quotaNumber,
      levelNumber,
      entryValue: matrixService.calculateLevelValue(levelNumber),
    })
  } catch (error: any) {
    console.error('Erro ao comprar cota:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
