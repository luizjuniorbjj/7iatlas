// 7iATLAS - API de Saldo da Carteira
// GET /api/wallet/balance - Retorna saldo disponível do usuário

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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
        id: true,
        balance: true,
        totalDeposited: true,
        totalEarned: true,
        totalBonus: true,
        totalWithdrawn: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      balance: Number(user.balance),
      totalDonated: Number(user.totalDeposited), // Doado (antes: depositado)
      totalReceived: Number(user.totalEarned) + Number(user.totalBonus), // Recebido total
      totalWithdrawn: Number(user.totalWithdrawn),
    })
  } catch (error) {
    console.error('Erro ao buscar saldo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
