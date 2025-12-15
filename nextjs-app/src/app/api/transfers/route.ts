// 7iATLAS - API de Transferências
// Endpoints para transferências internas

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { transferService } from '@/services/transfer.service'
import { notificationService } from '@/services/notification.service'
import prisma from '@/lib/prisma'
import { DEMO_MODE, DEMO_TOKEN, demoTransfers, demoStats } from '@/lib/demo-data'

// GET /api/transfers - Histórico de transferências
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Modo Demo
    if (DEMO_MODE || token === DEMO_TOKEN) {
      return NextResponse.json({
        history: demoTransfers,
        limits: {
          dailyLimit: 100,
          dailyUsed: 20,
          dailyRemaining: 80,
          perTransactionLimit: 50,
          minAmount: 10,
          maxTransactionsPerDay: 3,
          transactionsToday: 1,
        }
      })
    }

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const history = await transferService.getTransferHistory(decoded.userId, limit, offset)
    const limits = await transferService.getTransferLimits(decoded.userId)

    return NextResponse.json({
      history,
      limits,
    })
  } catch (error: any) {
    console.error('Erro ao listar transferências:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/transfers - Realizar transferência
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
    const { toUserCode, toWallet, amount, pin, description } = body

    // Precisa informar destinatário
    const toUserIdentifier = toUserCode || toWallet
    if (!toUserIdentifier) {
      return NextResponse.json(
        { error: 'Informe o código ou wallet do destinatário' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    if (!pin) {
      return NextResponse.json({ error: 'PIN é obrigatório' }, { status: 400 })
    }

    // Realiza transferência
    const result = await transferService.transfer(
      decoded.userId,
      toUserIdentifier,
      amount,
      pin,
      description
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Busca dados para notificação
    const fromUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { name: true, referralCode: true },
    })

    const toUser = await prisma.user.findFirst({
      where: {
        OR: [
          { referralCode: toUserIdentifier },
          { walletAddress: toUserIdentifier },
        ],
      },
      select: { id: true, name: true, referralCode: true },
    })

    // Envia notificações
    if (toUser) {
      await notificationService.notifyTransferReceived(
        toUser.id,
        amount,
        fromUser?.name || fromUser?.referralCode || 'Usuário'
      )
    }

    await notificationService.notifyTransferSent(
      decoded.userId,
      amount,
      toUser?.name || toUser?.referralCode || 'Destinatário'
    )

    return NextResponse.json({
      success: true,
      transferId: result.transferId,
      amount,
    })
  } catch (error: any) {
    console.error('Erro ao realizar transferência:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
