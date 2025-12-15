// 7iATLAS - API de Notificações
// Endpoints para gerenciamento de preferências de notificação

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { notificationService } from '@/services/notification.service'
import { DEMO_MODE, DEMO_TOKEN, demoNotifications } from '@/lib/demo-data'

// GET /api/notifications - Preferências e histórico
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'preferences'

    // Modo Demo
    if (DEMO_MODE || token === DEMO_TOKEN) {
      if (type === 'history') {
        return NextResponse.json({
          history: demoNotifications.map(n => ({
            ...n,
            channel: 'PUSH',
            status: n.read ? 'CLICKED' : 'SENT'
          }))
        })
      }
      return NextResponse.json({
        preferences: {
          notifyEmail: true,
          notifyPush: true,
          notifyOnQueueAdvance: true,
          notifyOnCycle: true,
          notifyOnBonus: true,
          notifyOnTransfer: true,
          notifyFrequency: 'realtime'
        }
      })
    }

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    if (type === 'history') {
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')
      const history = await notificationService.getNotificationHistory(decoded.userId, limit, offset)
      return NextResponse.json({ history })
    }

    // Preferências
    const preferences = await notificationService.getPreferences(decoded.userId)
    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('Erro ao buscar notificações:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/notifications - Atualiza preferências
export async function PUT(request: NextRequest) {
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
    const {
      notifyEmail,
      notifyPush,
      notifyOnQueueAdvance,
      notifyOnCycle,
      notifyOnBonus,
      notifyOnTransfer,
      notifyFrequency,
    } = body

    const success = await notificationService.updatePreferences(decoded.userId, {
      notifyEmail,
      notifyPush,
      notifyOnQueueAdvance,
      notifyOnCycle,
      notifyOnBonus,
      notifyOnTransfer,
      notifyFrequency,
    })

    if (!success) {
      return NextResponse.json({ error: 'Erro ao atualizar preferências' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar preferências:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
