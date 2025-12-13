// 7iATLAS - API de PIN
// Endpoints para gerenciamento do PIN de segurança

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { transferService } from '@/services/transfer.service'

// GET /api/users/pin - Verifica se tem PIN configurado
export async function GET(request: NextRequest) {
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

    const hasPin = await transferService.hasPin(decoded.userId)

    return NextResponse.json({ hasPin })
  } catch (error: any) {
    console.error('Erro ao verificar PIN:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/users/pin - Cria ou altera PIN
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
    const { password, pin, confirmPin, action } = body

    if (!password) {
      return NextResponse.json({ error: 'Senha é obrigatória' }, { status: 400 })
    }

    if (!pin) {
      return NextResponse.json({ error: 'PIN é obrigatório' }, { status: 400 })
    }

    if (pin !== confirmPin) {
      return NextResponse.json({ error: 'PINs não conferem' }, { status: 400 })
    }

    let result
    if (action === 'change') {
      result = await transferService.changePin(decoded.userId, password, pin)
    } else {
      result = await transferService.createPin(decoded.userId, password, pin)
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: action === 'change' ? 'PIN alterado com sucesso' : 'PIN criado com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao gerenciar PIN:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
