import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { DEMO_MODE } from '@/lib/demo-data'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Em modo demo, apenas simula o envio
    if (DEMO_MODE) {
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá as instruções.'
      })
    }

    // Busca usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Por segurança, sempre retorna sucesso mesmo se email não existir
    // Isso evita enumeration de usuários
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá as instruções.'
      })
    }

    // Gera token de reset (válido por 1 hora)
    const resetToken = crypto.randomUUID()
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Salva token no usuário
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpires,
      },
    })

    // TODO: Enviar email com link de reset
    // O link seria: /auth/reset-password?token=${resetToken}
    // Por enquanto, apenas loga o token (em produção, enviaria email)
    console.log(`Reset token for ${email}: ${resetToken}`)

    return NextResponse.json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá as instruções.'
    })
  } catch (error) {
    console.error('Erro no forgot-password:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
