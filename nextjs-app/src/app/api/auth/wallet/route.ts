import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyWalletSignature, generateTokens } from '@/lib/auth'
import { blockchainService } from '@/services/blockchain.service'
import { DEMO_MODE, demoUser, DEMO_TOKEN } from '@/lib/demo-data'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, signature, message } = body

    // Validações
    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { success: false, error: 'Dados de autenticação incompletos' },
        { status: 400 }
      )
    }

    // Modo Demo - aceita login por wallet sem validação de assinatura
    if (DEMO_MODE && walletAddress.toLowerCase() === demoUser.walletAddress.toLowerCase()) {
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: demoUser.id,
            email: demoUser.email,
            walletAddress: demoUser.walletAddress,
            name: demoUser.name,
            referralCode: demoUser.referralCode,
            status: demoUser.status,
            currentLevel: demoUser.currentLevel,
          },
          accessToken: DEMO_TOKEN,
          refreshToken: DEMO_TOKEN,
        },
      })
    }

    if (!blockchainService.isValidAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Endereço da carteira inválido' },
        { status: 400 }
      )
    }

    // Verifica assinatura
    const isValidSignature = await verifyWalletSignature(
      message,
      signature,
      walletAddress
    )

    if (!isValidSignature) {
      return NextResponse.json(
        { success: false, error: 'Assinatura inválida' },
        { status: 401 }
      )
    }

    // Verifica timestamp na mensagem (5 minutos de validade)
    const timestampMatch = message.match(/Login 7iATLAS: (\d+)/)
    if (timestampMatch) {
      const messageTimestamp = parseInt(timestampMatch[1])
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000

      if (now - messageTimestamp > fiveMinutes) {
        return NextResponse.json(
          { success: false, error: 'Mensagem expirada. Tente novamente.' },
          { status: 401 }
        )
      }
    }

    // Busca ou cria usuário
    let user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    })

    if (!user) {
      // Cria novo usuário
      user = await prisma.user.create({
        data: {
          walletAddress: walletAddress.toLowerCase(),
          status: 'PENDING',
        },
      })
    }

    // Verifica se está suspenso
    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, error: 'Conta suspensa. Entre em contato com o suporte.' },
        { status: 403 }
      )
    }

    // Gera tokens
    const tokens = generateTokens({
      userId: user.id,
      walletAddress: user.walletAddress,
      email: user.email || undefined,
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
          name: user.name,
          referralCode: user.referralCode,
          status: user.status,
          currentLevel: user.currentLevel,
        },
        ...tokens,
      },
    })
  } catch (error) {
    console.error('Erro no login wallet:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
