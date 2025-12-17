/**
 * 7iATLAS - Seed Script para 10.000 usuários
 * Simula um sistema real com:
 * - 10.000 usuários distribuídos
 * - Admin com ~500 indicados diretos
 * - Admin com cotas em todos os 10 níveis
 * - Ciclos completados realistas
 * - Bônus de indicação
 * - Transações variadas
 * - Filas com scores variados
 */

import { PrismaClient, UserStatus, QueueStatus, TransactionType, TransactionStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Configuração dos níveis conforme documentação
const LEVEL_CONFIG = {
  ENTRY_VALUES: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120],
  REWARD_VALUES: [20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240],
  BONUS_VALUES: [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096],
}

// Nomes brasileiros para realismo
const FIRST_NAMES = [
  'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Lucas', 'Fernanda',
  'Rafael', 'Camila', 'Bruno', 'Leticia', 'Thiago', 'Amanda', 'Gabriel',
  'Patricia', 'Gustavo', 'Larissa', 'Matheus', 'Beatriz', 'Felipe', 'Carolina',
  'André', 'Mariana', 'Diego', 'Natalia', 'Rodrigo', 'Isabela', 'Leandro',
  'Vitória', 'Ricardo', 'Daniela', 'Eduardo', 'Renata', 'Marcos', 'Priscila',
  'Alexandre', 'Vanessa', 'Fernando', 'Tatiana', 'Marcelo', 'Simone', 'Paulo',
  'Fabiana', 'Roberto', 'Michele', 'Vinicius', 'Cristina', 'Daniel', 'Sandra'
]

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida',
  'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
  'Araújo', 'Melo', 'Barbosa', 'Nascimento', 'Moura', 'Cardoso', 'Correia',
  'Dias', 'Campos', 'Nunes', 'Teixeira', 'Castro', 'Monteiro', 'Pinto',
  'Mendes', 'Rocha', 'Cavalcanti', 'Vieira', 'Moreira', 'Freitas', 'Lopes'
]

function randomName(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  return `${first} ${last}`
}

function randomCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

function randomWallet(): string {
  return '0x' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
}

function randomDate(daysAgo: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))
  return date
}

// Calcula score baseado em tempo de espera, reentradas e indicados
function calculateScore(waitingHours: number, reentries: number, referralsCount: number): number {
  const referralPoints = Math.min(290, referralsCount <= 5 ? referralsCount * 10 :
    referralsCount <= 20 ? 50 + (referralsCount - 5) * 8 :
    referralsCount <= 50 ? 170 + (referralsCount - 20) * 4 : 290)
  return (waitingHours * 2) + (reentries * 1.5) + referralPoints
}

async function main() {
  console.log('🚀 Iniciando seed massivo de 10.000 usuários...')
  console.log('⚠️  Este processo pode demorar alguns minutos...\n')

  // 1. Limpar banco
  console.log('🗑️  Limpando banco de dados...')
  await prisma.notificationLog.deleteMany()
  await prisma.pushSubscription.deleteMany()
  await prisma.internalTransfer.deleteMany()
  await prisma.bonusHistory.deleteMany()
  await prisma.cycleHistory.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.queueEntry.deleteMany()
  await prisma.levelStats.deleteMany()
  await prisma.level.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ Banco limpo!\n')

  // 2. Criar níveis
  console.log('📊 Criando 10 níveis...')
  const levels = []
  for (let i = 1; i <= 10; i++) {
    const level = await prisma.level.create({
      data: {
        levelNumber: i,
        entryValue: LEVEL_CONFIG.ENTRY_VALUES[i - 1],
        rewardValue: LEVEL_CONFIG.REWARD_VALUES[i - 1],
        bonusValue: LEVEL_CONFIG.BONUS_VALUES[i - 1],
        totalUsers: 0,
        totalCycles: 0,
        cashBalance: 0,
      }
    })
    levels.push(level)
  }
  console.log('✅ Níveis criados!\n')

  // 3. Criar admin
  console.log('👑 Criando admin principal...')
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@7iatlas.com',
      passwordHash,
      walletAddress: '0x7iATLAS000000000000000000000000000000001',
      name: 'Administrador 7iATLAS',
      referralCode: 'ADMIN7I',
      status: UserStatus.ACTIVE,
      currentLevel: 10,
      totalDeposited: 50000,
      totalEarned: 0,
      totalBonus: 0,
      totalWithdrawn: 0,
      balance: 50000, // Saldo inicial alto para testes
      activatedAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    }
  })
  console.log(`✅ Admin criado: ${admin.email}\n`)

  // 4. Criar usuários em lotes
  const TOTAL_USERS = 10000
  const BATCH_SIZE = 500
  const users: any[] = [admin]

  console.log(`👥 Criando ${TOTAL_USERS} usuários em lotes de ${BATCH_SIZE}...`)

  for (let batch = 0; batch < TOTAL_USERS / BATCH_SIZE; batch++) {
    const batchUsers = []

    for (let i = 0; i < BATCH_SIZE; i++) {
      const userNum = batch * BATCH_SIZE + i + 1
      const name = randomName()

      // 500 usuários são indicados diretos do admin
      // Resto tem indicadores aleatórios
      let referrerId: string | null = null
      if (userNum <= 500) {
        referrerId = admin.id
      } else if (users.length > 1) {
        // Indicador aleatório entre os usuários existentes
        const randomIdx = Math.floor(Math.random() * Math.min(users.length, userNum - 1))
        referrerId = users[randomIdx].id
      }

      // Distribuição de níveis mais realista
      // Maioria nos níveis baixos, poucos nos altos
      const levelWeights = [30, 25, 18, 12, 7, 4, 2, 1, 0.7, 0.3]
      let cumulative = 0
      const rand = Math.random() * 100
      let currentLevel = 1
      for (let l = 0; l < 10; l++) {
        cumulative += levelWeights[l]
        if (rand < cumulative) {
          currentLevel = l + 1
          break
        }
      }

      const daysAgo = Math.floor(Math.random() * 90) + 1 // Últimos 90 dias
      const createdAt = randomDate(daysAgo)
      const activatedAt = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000)

      batchUsers.push({
        email: `user${userNum}@teste.com`,
        passwordHash,
        walletAddress: randomWallet(),
        name,
        referralCode: randomCode(),
        referrerId,
        status: UserStatus.ACTIVE,
        currentLevel,
        totalDeposited: 0,
        totalEarned: 0,
        totalBonus: 0,
        totalWithdrawn: 0,
        balance: 0,
        activatedAt,
        createdAt,
      })
    }

    await prisma.user.createMany({ data: batchUsers })

    // Buscar usuários criados para ter os IDs
    const createdUsers = await prisma.user.findMany({
      where: {
        email: { in: batchUsers.map(u => u.email) }
      },
      select: { id: true, currentLevel: true, referrerId: true, createdAt: true }
    })
    users.push(...createdUsers)

    const progress = Math.round(((batch + 1) * BATCH_SIZE / TOTAL_USERS) * 100)
    console.log(`   [${progress}%] ${(batch + 1) * BATCH_SIZE} usuários criados...`)
  }
  console.log(`✅ ${TOTAL_USERS} usuários criados!\n`)

  // 5. Criar cotas e entradas na fila
  console.log('🎫 Criando cotas e entradas na fila...')

  // Admin terá cotas em TODOS os níveis (3-10 cotas por nível)
  // No schema, QueueEntry É a cota - não existe tabela Quota separada
  console.log('   Criando cotas do admin em todos os níveis...')
  const adminQueueData = []

  for (let levelNum = 1; levelNum <= 10; levelNum++) {
    const level = levels[levelNum - 1]
    const numQuotas = Math.floor(Math.random() * 8) + 3 // 3 a 10 cotas

    for (let q = 0; q < numQuotas; q++) {
      const enteredAt = randomDate(30)
      const waitingHours = (Date.now() - enteredAt.getTime()) / (1000 * 60 * 60)
      const reentries = Math.floor(Math.random() * 5)
      const score = calculateScore(waitingHours, reentries, 500) // Admin tem ~500 indicados

      adminQueueData.push({
        userId: admin.id,
        levelId: level.id,
        quotaNumber: q + 1,
        position: 0, // Será calculado depois
        score,
        reentries,
        status: QueueStatus.WAITING,
        enteredAt,
      })
    }
  }

  // Criar cotas para outros usuários
  // QueueEntry É a cota no schema
  console.log('   Criando cotas para 10.000 usuários...')
  const allQueueData: any[] = []

  for (let i = 1; i < users.length; i++) {
    const user = users[i]
    const maxLevel = user.currentLevel || 1

    // Cada usuário tem 1-5 cotas, principalmente no nível atual e abaixo
    const numQuotas = Math.floor(Math.random() * 5) + 1

    for (let q = 0; q < numQuotas; q++) {
      // Nível da cota: maioria no nível atual, algumas abaixo
      let quotaLevel = maxLevel
      if (Math.random() < 0.3 && maxLevel > 1) {
        quotaLevel = Math.floor(Math.random() * (maxLevel - 1)) + 1
      }

      const level = levels[quotaLevel - 1]
      const enteredAt = randomDate(60)
      const waitingHours = (Date.now() - enteredAt.getTime()) / (1000 * 60 * 60)
      const reentries = Math.floor(Math.random() * 3)

      // Contar indicados do usuário (aproximado)
      const referralsCount = Math.floor(Math.random() * 20)
      const score = calculateScore(waitingHours, reentries, referralsCount)

      allQueueData.push({
        userId: user.id,
        levelId: level.id,
        quotaNumber: q + 1,
        position: 0,
        score,
        reentries,
        status: QueueStatus.WAITING,
        enteredAt,
      })
    }

    if (i % 1000 === 0) {
      console.log(`   [${Math.round(i / 100)}%] Processando usuário ${i}...`)
    }
  }

  // Inserir admin queue entries primeiro
  await prisma.queueEntry.createMany({ data: adminQueueData })

  // Inserir outras queue entries em lotes
  console.log('   Inserindo entradas na fila...')
  for (let i = 0; i < allQueueData.length; i += 5000) {
    await prisma.queueEntry.createMany({ data: allQueueData.slice(i, i + 5000) })
  }

  console.log(`✅ ${allQueueData.length + adminQueueData.length} cotas criadas!\n`)

  // 6. Atualizar posições na fila por nível
  console.log('📍 Calculando posições nas filas...')
  for (let levelNum = 1; levelNum <= 10; levelNum++) {
    const level = levels[levelNum - 1]

    // Buscar todas as entradas do nível ordenadas por score
    const entries = await prisma.queueEntry.findMany({
      where: { levelId: level.id, status: QueueStatus.WAITING },
      orderBy: { score: 'desc' },
      select: { id: true }
    })

    // Atualizar posições em lotes
    for (let i = 0; i < entries.length; i += 1000) {
      const batch = entries.slice(i, i + 1000)
      await Promise.all(
        batch.map((entry, idx) =>
          prisma.queueEntry.update({
            where: { id: entry.id },
            data: { position: i + idx + 1 }
          })
        )
      )
    }

    // Atualizar estatísticas do nível
    const totalInQueue = entries.length
    await prisma.level.update({
      where: { id: level.id },
      data: { totalUsers: totalInQueue }
    })

    console.log(`   Nível ${levelNum}: ${totalInQueue} na fila`)
  }
  console.log('✅ Posições calculadas!\n')

  // 7. Simular ciclos completados e transações
  console.log('🔄 Simulando ciclos e transações...')

  // Criar transações para o admin
  const adminTransactions = []
  let adminTotalEarned = 0
  let adminTotalBonus = 0

  // Admin completou vários ciclos
  for (let levelNum = 1; levelNum <= 10; levelNum++) {
    const numCycles = Math.floor(Math.random() * 20) + 5 // 5-25 ciclos por nível
    const rewardValue = LEVEL_CONFIG.REWARD_VALUES[levelNum - 1]

    for (let c = 0; c < numCycles; c++) {
      const date = randomDate(60)
      adminTransactions.push({
        userId: admin.id,
        type: TransactionType.CYCLE_REWARD,
        amount: rewardValue,
        status: TransactionStatus.CONFIRMED,
        description: `Ciclo completado - Nível ${levelNum}`,
        confirmedAt: date,
        createdAt: date,
      })
      adminTotalEarned += rewardValue
    }

    // Atualizar totalCycles do nível
    await prisma.level.update({
      where: { levelNumber: levelNum },
      data: { totalCycles: { increment: numCycles } }
    })
  }

  // Admin recebeu bônus dos 500 indicados
  for (let i = 0; i < 200; i++) { // 200 bônus variados
    const levelNum = Math.floor(Math.random() * 10) + 1
    const bonusValue = LEVEL_CONFIG.BONUS_VALUES[levelNum - 1]
    const date = randomDate(60)

    adminTransactions.push({
      userId: admin.id,
      type: TransactionType.BONUS_REFERRAL,
      amount: bonusValue,
      status: TransactionStatus.CONFIRMED,
      description: `Bônus de indicado - Nível ${levelNum}`,
      confirmedAt: date,
      createdAt: date,
    })
    adminTotalBonus += bonusValue
  }

  // Depósito inicial do admin
  adminTransactions.push({
    userId: admin.id,
    type: TransactionType.DEPOSIT,
    amount: 50000,
    status: TransactionStatus.CONFIRMED,
    description: 'Depósito inicial',
    confirmedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
  })

  await prisma.transaction.createMany({ data: adminTransactions })

  // Atualizar saldo do admin
  await prisma.user.update({
    where: { id: admin.id },
    data: {
      totalEarned: adminTotalEarned,
      totalBonus: adminTotalBonus,
      balance: 50000 + adminTotalEarned + adminTotalBonus,
      totalDeposited: 50000,
    }
  })

  console.log(`   Admin: $${adminTotalEarned} em ciclos, $${adminTotalBonus} em bônus`)

  // Criar transações para outros usuários (em lotes)
  console.log('   Criando transações para outros usuários...')
  const userTransactions: any[] = []

  for (let i = 1; i < Math.min(users.length, 5000); i++) { // Primeiros 5000 usuários
    const user = users[i]
    const maxLevel = user.currentLevel || 1

    // Alguns ciclos completados
    const numCycles = Math.floor(Math.random() * maxLevel * 2)
    let totalEarned = 0

    for (let c = 0; c < numCycles; c++) {
      const levelNum = Math.floor(Math.random() * maxLevel) + 1
      const rewardValue = LEVEL_CONFIG.REWARD_VALUES[levelNum - 1]
      const date = randomDate(60)

      userTransactions.push({
        userId: user.id,
        type: TransactionType.CYCLE_REWARD,
        amount: rewardValue,
        status: TransactionStatus.CONFIRMED,
        description: `Ciclo completado - Nível ${levelNum}`,
        confirmedAt: date,
        createdAt: date,
      })
      totalEarned += rewardValue
    }

    // Atualizar usuário
    if (totalEarned > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          totalEarned,
          balance: totalEarned,
        }
      })
    }

    if (i % 1000 === 0) {
      // Inserir lote de transações
      if (userTransactions.length > 0) {
        await prisma.transaction.createMany({ data: userTransactions })
        userTransactions.length = 0
      }
      console.log(`   [${Math.round(i / 50)}%] ${i} usuários processados...`)
    }
  }

  // Inserir transações restantes
  if (userTransactions.length > 0) {
    await prisma.transaction.createMany({ data: userTransactions })
  }

  console.log('✅ Transações criadas!\n')

  // 8. Criar estatísticas dos níveis
  // LevelStats schema: totalCycles, cyclesToday, avgCyclesPerDay, avgWaitTime, minWaitTime, maxWaitTime, firstCycleAt, lastCycleAt
  console.log('📈 Criando estatísticas dos níveis...')
  for (let levelNum = 1; levelNum <= 10; levelNum++) {
    const level = levels[levelNum - 1]

    await prisma.levelStats.upsert({
      where: { levelId: level.id },
      update: {
        totalCycles: Math.floor(Math.random() * 500) + 50,
        cyclesToday: Math.floor(Math.random() * 20),
        avgCyclesPerDay: Math.floor(Math.random() * 30) + 5,
        avgWaitTime: Math.floor(Math.random() * 1440) + 60, // 1h - 24h em minutos
        minWaitTime: Math.floor(Math.random() * 60) + 10,
        maxWaitTime: Math.floor(Math.random() * 2880) + 120,
        firstCycleAt: randomDate(90),
        lastCycleAt: randomDate(1),
      },
      create: {
        levelId: level.id,
        totalCycles: Math.floor(Math.random() * 500) + 50,
        cyclesToday: Math.floor(Math.random() * 20),
        avgCyclesPerDay: Math.floor(Math.random() * 30) + 5,
        avgWaitTime: Math.floor(Math.random() * 1440) + 60, // 1h - 24h em minutos
        minWaitTime: Math.floor(Math.random() * 60) + 10,
        maxWaitTime: Math.floor(Math.random() * 2880) + 120,
        firstCycleAt: randomDate(90),
        lastCycleAt: randomDate(1),
      }
    })
  }
  console.log('✅ Estatísticas criadas!\n')

  // 8.5. Simular injeções do Jupiter Pool (para demonstração)
  console.log('💉 Simulando injeções do Jupiter Pool...')
  const injectionTransactions = []

  // Simular algumas injeções nos níveis mais altos (que poderiam estar travados)
  const injectionAmounts = [
    { level: 8, amount: 1280 * 3 }, // 3 entradas do nível 8
    { level: 9, amount: 2560 * 2 }, // 2 entradas do nível 9
    { level: 10, amount: 5120 * 1 }, // 1 entrada do nível 10
    { level: 7, amount: 640 * 2 }, // 2 entradas do nível 7
  ]

  for (const injection of injectionAmounts) {
    const date = randomDate(30) // Últimos 30 dias
    injectionTransactions.push({
      userId: admin.id, // Sistema (usando admin como proxy)
      type: TransactionType.JUPITER_POOL_WITHDRAWAL,
      amount: injection.amount,
      status: TransactionStatus.CONFIRMED,
      description: `Injeção Jupiter Pool - Nível ${injection.level} (destravamento)`,
      confirmedAt: date,
      createdAt: date,
    })
  }

  await prisma.transaction.createMany({ data: injectionTransactions })

  const totalInjected = injectionAmounts.reduce((sum, i) => sum + i.amount, 0)
  console.log(`✅ ${injectionTransactions.length} injeções criadas (total: $${totalInjected.toLocaleString()})\n`)

  // 8.6. Atualizar cashBalance dos níveis (Fundo Cósmico circulante)
  console.log('💰 Atualizando saldo circulante dos níveis (Fundo Cósmico)...')
  for (let levelNum = 1; levelNum <= 10; levelNum++) {
    const level = levels[levelNum - 1]
    // Simular saldo circulante baseado no número de pessoas na fila × valor de entrada
    const queueCount = await prisma.queueEntry.count({
      where: { levelId: level.id, status: QueueStatus.WAITING }
    })
    // cashBalance = (pessoas na fila × entrada) simulando o dinheiro circulando
    const cashBalance = Math.round(queueCount * LEVEL_CONFIG.ENTRY_VALUES[levelNum - 1] * 0.3) // 30% como circulante

    await prisma.level.update({
      where: { id: level.id },
      data: {
        cashBalance,
        totalUsers: queueCount,
      }
    })
  }
  console.log('✅ Saldo circulante atualizado!\n')

  // 9. Resumo final
  console.log('=' .repeat(50))
  console.log('📊 RESUMO DO SEED')
  console.log('=' .repeat(50))

  const totalUsers = await prisma.user.count()
  const totalQueueEntries = await prisma.queueEntry.count()
  const totalTransactions = await prisma.transaction.count()

  console.log(`👥 Total de usuários: ${totalUsers.toLocaleString()}`)
  console.log(`🎫 Total de cotas (queueEntries): ${totalQueueEntries.toLocaleString()}`)
  console.log(`💰 Total de transações: ${totalTransactions.toLocaleString()}`)

  // Stats por nível
  console.log('\n📊 Distribuição por nível:')
  for (let levelNum = 1; levelNum <= 10; levelNum++) {
    const level = levels[levelNum - 1]
    const count = await prisma.queueEntry.count({
      where: { levelId: level.id, status: QueueStatus.WAITING }
    })
    console.log(`   Nível ${levelNum} ($${LEVEL_CONFIG.ENTRY_VALUES[levelNum - 1]}): ${count.toLocaleString()} na fila`)
  }

  // Stats do admin
  const adminFinal = await prisma.user.findUnique({
    where: { id: admin.id },
    include: {
      _count: { select: { referrals: true } }
    }
  })

  console.log('\n👑 Admin (admin@7iatlas.com):')
  console.log(`   Indicados diretos: ${adminFinal?._count.referrals || 0}`)
  console.log(`   Total ganho: $${Number(adminFinal?.totalEarned || 0).toLocaleString()}`)
  console.log(`   Total bônus: $${Number(adminFinal?.totalBonus || 0).toLocaleString()}`)
  console.log(`   Saldo atual: $${Number(adminFinal?.balance || 0).toLocaleString()}`)

  const adminQuotas = await prisma.queueEntry.count({ where: { userId: admin.id } })
  console.log(`   Total de cotas: ${adminQuotas}`)

  console.log('\n✅ SEED COMPLETO!')
  console.log('🔐 Login: admin@7iatlas.com / admin123')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
