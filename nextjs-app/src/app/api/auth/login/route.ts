import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword, generateTokens } from '@/lib/auth'
import { DEMO_MODE, demoUser, DEMO_TOKEN } from '@/lib/demo-data'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Modo Demo - aceita credenciais de demonstração
    if (DEMO_MODE) {
      if (email === 'demo@7iatlas.ai' && password === 'demo123') {
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
    }

    // Validações
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Busca usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Esta conta usa login por carteira' },
        { status: 401 }
      )
    }

    // Verifica senha
    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Email ou senha incorretos' },
        { status: 401 }
      )
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
    console.error('Erro no login:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
