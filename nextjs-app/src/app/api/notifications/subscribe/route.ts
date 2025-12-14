// 7iATLAS - API de Push Subscription
// Endpoints para gerenciar subscrições de push notification

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { notificationService } from '@/services/notification.service'

// POST /api/notifications/subscribe - Registra push subscription
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint, keys, device } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Dados de subscription inválidos' },
        { status: 400 }
      )
    }

    const success = await notificationService.subscribePush(decoded.userId, {
      endpoint,
      keys,
      device,
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao registrar subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao registrar push:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/notifications/subscribe - Remove push subscription
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint é obrigatório' }, { status: 400 })
    }

    const success = await notificationService.unsubscribePush(decoded.userId, endpoint)

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao remover subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao remover push:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
