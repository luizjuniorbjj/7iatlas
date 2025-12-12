import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { blockchainService } from '@/services/blockchain.service'
import { matrixService } from '@/services/matrix.service'

function getTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.substring(7)
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { txHash } = body

    if (!txHash) {
      return NextResponse.json(
        { success: false, error: 'Hash da transação não fornecido' },
        { status: 400 }
      )
    }

    // Verifica se a transação já foi usada
    const existingTx = await prisma.transaction.findUnique({
      where: { txHash },
    })

    if (existingTx) {
      return NextResponse.json(
        { success: false, error: 'Esta transação já foi processada' },
        { status: 400 }
      )
    }

    // Busca usuário
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Valor esperado (nível 1 = $10)
    const expectedAmount = matrixService.calculateLevelValue(1)

    // Verifica transação na blockchain
    const verification = await blockchainService.verifyDeposit(
      txHash,
      user.walletAddress,
      expectedAmount
    )

    if (!verification.valid) {
      return NextResponse.json(
        {
          success: false,
          error: verification.error || 'Transação inválida',
          confirmations: verification.confirmations,
        },
        { status: 400 }
      )
    }

    // Ativa usuário
    try {
      await matrixService.activateUser(user.id, txHash)

      return NextResponse.json({
        success: true,
        message: 'Depósito verificado! Sua conta foi ativada.',
        data: {
          amount: verification.actualAmount,
          confirmations: verification.confirmations,
          txHash,
        },
      })
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Erro ao ativar usuário' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
