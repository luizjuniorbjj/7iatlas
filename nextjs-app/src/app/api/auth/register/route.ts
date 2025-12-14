import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword, generateTokens } from '@/lib/auth'
import { blockchainService } from '@/services/blockchain.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, walletAddress, name, referralCode } = body

    // Validações
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Endereço da carteira é obrigatório' },
        { status: 400 }
      )
    }

    if (!blockchainService.isValidAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Endereço da carteira inválido' },
        { status: 400 }
      )
    }

    // Verifica se carteira já existe
    const existingWallet = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    })

    if (existingWallet) {
      return NextResponse.json(
        { success: false, error: 'Esta carteira já está cadastrada' },
        { status: 400 }
      )
    }

    // Verifica se email já existe (se fornecido)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })

      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'Este email já está cadastrado' },
          { status: 400 }
        )
      }
    }

    // Busca indicador (se fornecido)
    let referrerId = null
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
      })

      if (referrer && referrer.status === 'ACTIVE') {
        referrerId = referrer.id
      }
    }

    // Hash da senha (se fornecida)
    let passwordHash = null
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Senha deve ter no mínimo 6 caracteres' },
          { status: 400 }
        )
      }
      passwordHash = await hashPassword(password)
    }

    // Cria usuário
    const user = await prisma.user.create({
      data: {
        email: email?.toLowerCase(),
        passwordHash,
        walletAddress: walletAddress.toLowerCase(),
        name,
        referrerId,
        status: 'PENDING',
      },
    })

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
        },
        ...tokens,
      },
      message: 'Conta criada com sucesso! Faça um depósito de $10 USDT para ativar.',
    })
  } catch (error) {
    console.error('Erro no registro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
