// 7iATLAS - Unread Notifications Count API
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Conta notificações não lidas (pendentes no NotificationLog)
    let count = 0
    try {
      // Verifica se o modelo existe no Prisma Client
      if (prisma.notificationLog) {
        count = await prisma.notificationLog.count({
          where: {
            userId: payload.userId,
            status: 'PENDING'
          }
        })
      }
    } catch {
      // Se tabela não existir ou outro erro, retorna 0
      count = 0
    }

    return NextResponse.json({
      success: true,
      count
    })
  } catch (error) {
    console.error('Erro ao contar notificações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
