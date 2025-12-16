// 7iATLAS - API de PIN de Segurança
// POST /api/users/pin - Definir/alterar PIN
// GET /api/users/pin - Verificar se tem PIN definido

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import * as bcrypt from 'bcryptjs'

// GET - Verificar se usuário tem PIN definido
export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
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

    // Verificar se está bloqueado
    const isBlocked = user.pinBlockedUntil && new Date(user.pinBlockedUntil) > new Date()

    return NextResponse.json({
      hasPin: !!user.pinHash,
      isBlocked,
      blockedUntil: isBlocked ? user.pinBlockedUntil : null,
      attempts: user.pinAttempts,
    })
  } catch (error) {
    console.error('Erro ao verificar PIN:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Definir ou alterar PIN
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
    const { pin, currentPin } = body

    // Validar PIN (4-6 dígitos)
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({
        error: 'PIN deve ter entre 4 e 6 dígitos numéricos'
      }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { pinHash: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Se já tem PIN, precisa informar o atual para alterar
    if (user.pinHash) {
      if (!currentPin) {
        return NextResponse.json({
          error: 'Informe o PIN atual para alterá-lo'
        }, { status: 400 })
      }

      const isValidCurrentPin = await bcrypt.compare(currentPin, user.pinHash)
      if (!isValidCurrentPin) {
        return NextResponse.json({
          error: 'PIN atual incorreto'
        }, { status: 400 })
      }
    }

    // Hash do novo PIN
    const pinHash = await bcrypt.hash(pin, 10)

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        pinHash,
        pinAttempts: 0,
        pinBlockedUntil: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: user.pinHash ? 'PIN alterado com sucesso' : 'PIN definido com sucesso',
    })
  } catch (error) {
    console.error('Erro ao definir PIN:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
