// 7iATLAS - API de Verificação de PIN
// POST /api/users/pin/verify - Verificar PIN para operações sensíveis

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import * as bcrypt from 'bcryptjs'

const MAX_ATTEMPTS = 5
const BLOCK_DURATION_MINUTES = 30

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

    const body = await request.json()
    const { pin } = body

    if (!pin) {
      return NextResponse.json({ error: 'PIN não fornecido' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        pinHash: true,
        pinBlockedUntil: true,
        pinAttempts: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se tem PIN definido
    if (!user.pinHash) {
      return NextResponse.json({
        error: 'PIN não definido. Configure seu PIN nas configurações.',
        needsSetup: true,
      }, { status: 400 })
    }

    // Verificar se está bloqueado
    if (user.pinBlockedUntil && new Date(user.pinBlockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.pinBlockedUntil).getTime() - Date.now()) / (1000 * 60)
      )
      return NextResponse.json({
        error: `PIN bloqueado. Tente novamente em ${remainingMinutes} minutos.`,
        isBlocked: true,
        blockedUntil: user.pinBlockedUntil,
      }, { status: 403 })
    }

    // Verificar PIN
    const isValid = await bcrypt.compare(pin, user.pinHash)

    if (!isValid) {
      const newAttempts = user.pinAttempts + 1
      const isNowBlocked = newAttempts >= MAX_ATTEMPTS

      await prisma.user.update({
        where: { id: payload.userId },
        data: {
          pinAttempts: newAttempts,
          pinBlockedUntil: isNowBlocked
            ? new Date(Date.now() + BLOCK_DURATION_MINUTES * 60 * 1000)
            : null,
        },
      })

      if (isNowBlocked) {
        return NextResponse.json({
          error: `PIN incorreto. Muitas tentativas. Bloqueado por ${BLOCK_DURATION_MINUTES} minutos.`,
          isBlocked: true,
          attemptsRemaining: 0,
        }, { status: 403 })
      }

      return NextResponse.json({
        error: 'PIN incorreto',
        attemptsRemaining: MAX_ATTEMPTS - newAttempts,
      }, { status: 400 })
    }

    // PIN correto - resetar tentativas
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        pinAttempts: 0,
        pinBlockedUntil: null,
      },
    })

    return NextResponse.json({
      success: true,
      valid: true,
    })
  } catch (error) {
    console.error('Erro ao verificar PIN:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
