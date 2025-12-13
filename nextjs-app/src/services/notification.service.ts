// 7iATLAS - Notification Service
// Sistema de notificações multicanal (Email + Push)

import prisma from '@/lib/prisma'

// ==========================================
// TIPOS
// ==========================================

type NotificationChannel = 'EMAIL' | 'PUSH'
type NotificationEvent = 'QUEUE_ADVANCE' | 'CYCLE_COMPLETED' | 'BONUS_RECEIVED' | 'TRANSFER_RECEIVED' | 'TRANSFER_SENT' | 'SYSTEM_ALERT'

interface NotificationPayload {
  userId: string
  event: NotificationEvent
  title: string
  body: string
  data?: Record<string, any>
}

interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  device?: string
}

// ==========================================
// CONFIGURAÇÃO
// ==========================================

// Variáveis de ambiente para serviços de email
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'console' // resend, sendgrid, ses, console
const RESEND_API_KEY = process.env.RESEND_API_KEY
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@7iatlas.com'
const APP_NAME = '7iATLAS'

// VAPID keys para Web Push
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@7iatlas.com'

// ==========================================
// FUNÇÕES DE NOTIFICAÇÃO
// ==========================================

/**
 * Envia notificação para um usuário (todos os canais configurados)
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { pushSubscriptions: true },
  })

  if (!user) return

  // Verifica preferências do usuário
  const shouldNotify = checkNotificationPreference(user, payload.event)
  if (!shouldNotify) return

  const promises: Promise<void>[] = []

  // Email
  if (user.notifyEmail && user.email) {
    promises.push(sendEmailNotification(user.email, payload))
  }

  // Push
  if (user.notifyPush && user.pushSubscriptions.length > 0) {
    for (const subscription of user.pushSubscriptions) {
      promises.push(sendPushNotification(subscription, payload))
    }
  }

  // Executa em paralelo
  await Promise.allSettled(promises)
}

/**
 * Verifica se usuário quer receber este tipo de notificação
 */
function checkNotificationPreference(user: any, event: NotificationEvent): boolean {
  switch (event) {
    case 'QUEUE_ADVANCE':
      return user.notifyOnQueueAdvance
    case 'CYCLE_COMPLETED':
      return user.notifyOnCycle
    case 'BONUS_RECEIVED':
      return user.notifyOnBonus
    case 'TRANSFER_RECEIVED':
    case 'TRANSFER_SENT':
      return user.notifyOnTransfer
    case 'SYSTEM_ALERT':
      return true // Sempre notifica alertas do sistema
    default:
      return true
  }
}

// ==========================================
// EMAIL
// ==========================================

/**
 * Envia notificação por email
 */
async function sendEmailNotification(
  email: string,
  payload: NotificationPayload
): Promise<void> {
  // Log da notificação
  const logEntry = await prisma.notificationLog.create({
    data: {
      userId: payload.userId,
      channel: 'EMAIL',
      event: payload.event,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: 'PENDING',
    },
  })

  try {
    // Gera HTML do email
    const html = generateEmailHtml(payload)

    // Envia baseado no serviço configurado
    switch (EMAIL_SERVICE) {
      case 'resend':
        await sendWithResend(email, payload.title, html)
        break
      case 'sendgrid':
        await sendWithSendGrid(email, payload.title, html)
        break
      case 'console':
      default:
        console.log(`[EMAIL] To: ${email}`)
        console.log(`[EMAIL] Subject: ${payload.title}`)
        console.log(`[EMAIL] Body: ${payload.body}`)
        break
    }

    // Atualiza status
    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    })
  } catch (error: any) {
    console.error('Erro ao enviar email:', error)
    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'FAILED',
        errorMsg: error.message,
      },
    })
  }
}

/**
 * Envia email usando Resend
 */
async function sendWithResend(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurado')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: `${APP_NAME} - ${subject}`,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Erro ao enviar email via Resend')
  }
}

/**
 * Envia email usando SendGrid
 */
async function sendWithSendGrid(to: string, subject: string, html: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY não configurado')
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL },
      subject: `${APP_NAME} - ${subject}`,
      content: [{ type: 'text/html', value: html }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Erro ao enviar email via SendGrid')
  }
}

/**
 * Gera HTML do email
 */
function generateEmailHtml(payload: NotificationPayload): string {
  const { title, body, event, data } = payload

  // Template básico - pode ser expandido
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0a0a0f; color: #fff; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; padding: 30px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #2F00FF, #FF00FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .content { margin-bottom: 30px; }
        h1 { color: #00FFA3; font-size: 20px; margin-bottom: 15px; }
        p { color: #ccc; line-height: 1.6; }
        .highlight { background: rgba(0, 255, 163, 0.1); border-left: 4px solid #00FFA3; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #2F00FF, #FF00FF); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 20px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #333; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">7iATLAS</div>
        </div>
        <div class="content">
          <h1>${title}</h1>
          <p>${body}</p>
          ${data?.amount ? `<div class="highlight"><strong>Valor: $${data.amount}</strong></div>` : ''}
          ${data?.levelNumber ? `<p>Nível: ${data.levelNumber}</p>` : ''}
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://7iatlas.com'}/dashboard" class="button">Ver Meu Dashboard</a>
        </div>
        <div class="footer">
          <p>Você está recebendo este email porque está cadastrado no ${APP_NAME}.</p>
          <p>Para gerenciar suas notificações, acesse as configurações do seu perfil.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ==========================================
// PUSH NOTIFICATIONS
// ==========================================

/**
 * Envia notificação push
 */
async function sendPushNotification(
  subscription: any,
  payload: NotificationPayload
): Promise<void> {
  const logEntry = await prisma.notificationLog.create({
    data: {
      userId: payload.userId,
      channel: 'PUSH',
      event: payload.event,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: 'PENDING',
    },
  })

  try {
    // Usa web-push library (precisa ser instalada)
    // npm install web-push

    // Por enquanto, apenas loga
    console.log(`[PUSH] To: ${subscription.endpoint}`)
    console.log(`[PUSH] Title: ${payload.title}`)
    console.log(`[PUSH] Body: ${payload.body}`)

    // TODO: Implementar envio real quando web-push estiver configurado
    // const webpush = require('web-push')
    // webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    // await webpush.sendNotification(
    //   { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    //   JSON.stringify({ title: payload.title, body: payload.body, data: payload.data })
    // )

    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    })

    // Atualiza lastUsedAt
    await prisma.pushSubscription.update({
      where: { id: subscription.id },
      data: { lastUsedAt: new Date() },
    })
  } catch (error: any) {
    console.error('Erro ao enviar push:', error)
    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'FAILED',
        errorMsg: error.message,
      },
    })
  }
}

// ==========================================
// GERENCIAMENTO DE SUBSCRIÇÕES PUSH
// ==========================================

/**
 * Registra subscrição push do usuário
 */
export async function subscribePush(
  userId: string,
  subscriptionData: PushSubscriptionData
): Promise<boolean> {
  try {
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscriptionData.endpoint,
        },
      },
      update: {
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
        device: subscriptionData.device,
      },
      create: {
        userId,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
        device: subscriptionData.device,
      },
    })

    // Atualiza preferência do usuário
    await prisma.user.update({
      where: { id: userId },
      data: { notifyPush: true },
    })

    return true
  } catch (error) {
    console.error('Erro ao registrar push subscription:', error)
    return false
  }
}

/**
 * Remove subscrição push
 */
export async function unsubscribePush(userId: string, endpoint: string): Promise<boolean> {
  try {
    await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    })

    // Verifica se ainda tem outras subscrições
    const remaining = await prisma.pushSubscription.count({
      where: { userId },
    })

    // Se não tem mais, desativa push
    if (remaining === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { notifyPush: false },
      })
    }

    return true
  } catch (error) {
    console.error('Erro ao remover push subscription:', error)
    return false
  }
}

// ==========================================
// PREFERÊNCIAS
// ==========================================

/**
 * Atualiza preferências de notificação do usuário
 */
export async function updatePreferences(
  userId: string,
  preferences: {
    notifyEmail?: boolean
    notifyPush?: boolean
    notifyOnQueueAdvance?: boolean
    notifyOnCycle?: boolean
    notifyOnBonus?: boolean
    notifyOnTransfer?: boolean
    notifyFrequency?: string
  }
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: preferences,
    })
    return true
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error)
    return false
  }
}

/**
 * Obtém preferências de notificação do usuário
 */
export async function getPreferences(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      notifyEmail: true,
      notifyPush: true,
      notifyOnQueueAdvance: true,
      notifyOnCycle: true,
      notifyOnBonus: true,
      notifyOnTransfer: true,
      notifyFrequency: true,
      email: true,
      pushSubscriptions: {
        select: {
          id: true,
          device: true,
          createdAt: true,
        },
      },
    },
  })

  return user
}

/**
 * Obtém histórico de notificações do usuário
 */
export async function getNotificationHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return prisma.notificationLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

// ==========================================
// NOTIFICAÇÕES PRÉ-DEFINIDAS
// ==========================================

/**
 * Notifica sobre avanço na fila
 */
export async function notifyQueueAdvance(
  userId: string,
  levelNumber: number,
  newPosition: number,
  totalInQueue: number
): Promise<void> {
  await sendNotification({
    userId,
    event: 'QUEUE_ADVANCE',
    title: `Você avançou na fila!`,
    body: `Você está na posição #${newPosition} de ${totalInQueue} no Nível ${levelNumber}.`,
    data: { levelNumber, position: newPosition, totalInQueue },
  })
}

/**
 * Notifica sobre ciclo completado
 */
export async function notifyCycleCompleted(
  userId: string,
  levelNumber: number,
  amount: number,
  nextLevel?: number
): Promise<void> {
  let body = `Parabéns! Você ciclou no Nível ${levelNumber} e ganhou $${amount}!`
  if (nextLevel) {
    body += ` Você avançou para o Nível ${nextLevel} e reentrou no Nível ${levelNumber}.`
  }

  await sendNotification({
    userId,
    event: 'CYCLE_COMPLETED',
    title: `Ciclo Completado! +$${amount}`,
    body,
    data: { levelNumber, amount, nextLevel },
  })
}

/**
 * Notifica sobre bônus recebido
 */
export async function notifyBonusReceived(
  userId: string,
  amount: number,
  referredName: string,
  levelNumber: number
): Promise<void> {
  await sendNotification({
    userId,
    event: 'BONUS_RECEIVED',
    title: `Bônus de Indicação! +$${amount}`,
    body: `Seu indicado ${referredName} ciclou no Nível ${levelNumber}! Você ganhou $${amount} de bônus.`,
    data: { amount, referredName, levelNumber },
  })
}

/**
 * Notifica sobre transferência recebida
 */
export async function notifyTransferReceived(
  userId: string,
  amount: number,
  fromUserName: string
): Promise<void> {
  await sendNotification({
    userId,
    event: 'TRANSFER_RECEIVED',
    title: `Transferência Recebida! +$${amount}`,
    body: `Você recebeu $${amount} de ${fromUserName}.`,
    data: { amount, fromUserName },
  })
}

/**
 * Notifica sobre transferência enviada
 */
export async function notifyTransferSent(
  userId: string,
  amount: number,
  toUserName: string
): Promise<void> {
  await sendNotification({
    userId,
    event: 'TRANSFER_SENT',
    title: `Transferência Enviada`,
    body: `Você enviou $${amount} para ${toUserName} com sucesso.`,
    data: { amount, toUserName },
  })
}

// ==========================================
// EXPORTS
// ==========================================

export const notificationService = {
  // Core
  sendNotification,
  // Push
  subscribePush,
  unsubscribePush,
  // Preferências
  updatePreferences,
  getPreferences,
  getNotificationHistory,
  // Notificações pré-definidas
  notifyQueueAdvance,
  notifyCycleCompleted,
  notifyBonusReceived,
  notifyTransferReceived,
  notifyTransferSent,
}
