// 7iATLAS - API de Saque
// POST /api/wallet/withdraw - Solicitar saque

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
    const { amount, walletAddress } = body

    // Validações
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    const minWithdrawal = 10 // Mínimo $10
    if (amount < minWithdrawal) {
      return NextResponse.json({
        error: `Valor mínimo para saque: $${minWithdrawal}`
      }, { status: 400 })
    }

    // Buscar saldo atual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, walletAddress: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar saldo
    if (Number(user.balance) < amount) {
      return NextResponse.json({
        error: 'Saldo insuficiente',
        available: Number(user.balance),
        requested: amount,
      }, { status: 400 })
    }

    // Usar wallet do usuário se não fornecida
    const targetWallet = walletAddress || user.walletAddress

    // Criar transação de saque (pendente - será processado manualmente ou por automação)
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.WITHDRAWAL,
        amount,
        status: TransactionStatus.PENDING,
        description: `Saque de $${amount} para ${targetWallet.slice(0, 10)}...`,
      },
    })

    // Debitar do saldo imediatamente (reserva)
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: { decrement: amount },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Solicitação de saque criada',
      transaction: {
        id: transaction.id,
        amount: Number(transaction.amount),
        status: transaction.status,
        walletAddress: targetWallet,
      },
      note: 'Seu saque será processado em até 24 horas',
    })
  } catch (error) {
    console.error('Erro ao processar saque:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
