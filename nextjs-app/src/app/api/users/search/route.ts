// 7iATLAS - API de Busca de Usuário
// GET /api/users/search?q=codigo_ou_email - Buscar usuário por código ou email

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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 3) {
      return NextResponse.json({ error: 'Busca deve ter pelo menos 3 caracteres' }, { status: 400 })
    }

    // Buscar por código de referência ou email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { referralCode: { equals: query, mode: 'insensitive' } },
          { email: { equals: query, mode: 'insensitive' } },
        ],
        // Não permitir transferir para si mesmo
        NOT: { id: payload.userId },
      },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        status: true,
      },
    })

    if (!user) {
      return NextResponse.json({ user: null, message: 'Usuário não encontrado' })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name || 'Usuário',
        email: user.email ? `${user.email.slice(0, 3)}***@${user.email.split('@')[1]}` : null,
        referralCode: user.referralCode,
        status: user.status,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
