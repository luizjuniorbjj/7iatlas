// 7iATLAS - API de Doação
// POST /api/wallet/donate - Iniciar doação para o sistema

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { TransactionType, TransactionStatus } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const userId = payload.userId
    const body = await request.json()
    const { amount } = body

    // Validações
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    const minDonation = 10 // Mínimo $10
    if (amount < minDonation) {
      return NextResponse.json({
        error: `Valor mínimo para doação: $${minDonation}`
      }, { status: 400 })
    }

    // Criar transação pendente
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.DEPOSIT,
        amount,
        status: TransactionStatus.PENDING,
        description: `Doação de $${amount}`,
      },
    })

    // TODO: Integrar com gateway de pagamento (PIX, crypto, etc)
    // Por enquanto, vamos simular confirmação automática para testes

    // Simular confirmação (em produção, isso seria via webhook do gateway)
    const confirmedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    })

    // Atualizar saldo do usuário
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: { increment: amount },
        totalDeposited: { increment: amount },
      },
    })

    // Atualizar fundos do sistema
    await prisma.systemFunds.update({
      where: { id: 1 },
      data: {
        totalIn: { increment: amount },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Doação realizada com sucesso',
      transaction: {
        id: confirmedTransaction.id,
        amount: Number(confirmedTransaction.amount),
        status: confirmedTransaction.status,
        confirmedAt: confirmedTransaction.confirmedAt,
      },
    })
  } catch (error) {
    console.error('Erro ao processar doação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
