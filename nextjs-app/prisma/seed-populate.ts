// 7iATLAS - Seed para Popular Sistema com Dados de Teste Robustos
// Este script cria o admin e popula o sistema com usuários de teste
// para verificar o comportamento da matriz 6x1

import { PrismaClient, UserStatus, QueueStatus, TransactionType, TransactionStatus, CyclePosition } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Configuração dos níveis conforme documentação 7iATLAS
const LEVEL_CONFIG = {
  ENTRY_VALUES: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120],
  REWARD_VALUES: [20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240],
  BONUS_VALUES: [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048],
}

// Gerar wallet aleatória
function generateWallet(): string {
  const chars = '0123456789abcdef'
  let wallet = '0x'
  for (let i = 0; i < 40; i++) {
    wallet += chars[Math.floor(Math.random() * chars.length)]
  }
  return wallet
}

// Gerar código de referência
function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

// Lista de nomes brasileiros para teste
const NOMES = [
  'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Lima',
  'Juliana Ferreira', 'Lucas Souza', 'Fernanda Almeida', 'Rafael Pereira', 'Camila Rodrigues',
  'Bruno Martins', 'Patricia Gomes', 'Thiago Ribeiro', 'Amanda Nascimento', 'Gabriel Carvalho',
  'Larissa Araújo', 'Matheus Barbosa', 'Beatriz Vieira', 'Felipe Correia', 'Isabela Mendes',
  'Gustavo Dias', 'Leticia Cardoso', 'Ricardo Moura', 'Mariana Campos', 'André Rocha',
  'Vitória Teixeira', 'Diego Pinto', 'Carolina Castro', 'Leandro Nunes', 'Natalia Cavalcanti',
  'Rodrigo Monteiro', 'Bruna Machado', 'Eduardo Freitas', 'Vanessa Ramos', 'Marcelo Azevedo',
  'Priscila Cunha', 'Alexandre Lopes', 'Tatiana Duarte', 'Renato Borges', 'Aline Morais',
  'Fernando Barros', 'Daniela Reis', 'Henrique Fonseca', 'Simone Moreira', 'William Andrade',
  'Raquel Medeiros', 'Vitor Nogueira', 'Luciana Pires', 'Fabio Melo', 'Adriana Guimarães'
]

async function main() {
  console.log('🚀 7iATLAS - Populando Sistema para Testes Robustos')
  console.log('═'.repeat(60))

  // 1. Criar/Atualizar os 10 níveis
  console.log('\n📊 Criando níveis...')
  for (let i = 1; i <= 10; i++) {
    await prisma.level.upsert({
      where: { levelNumber: i },
      update: {
        entryValue: LEVEL_CONFIG.ENTRY_VALUES[i - 1],
        rewardValue: LEVEL_CONFIG.REWARD_VALUES[i - 1],
        bonusValue: LEVEL_CONFIG.BONUS_VALUES[i - 1],
      },
      create: {
        levelNumber: i,
        entryValue: LEVEL_CONFIG.ENTRY_VALUES[i - 1],
        rewardValue: LEVEL_CONFIG.REWARD_VALUES[i - 1],
        bonusValue: LEVEL_CONFIG.BONUS_VALUES[i - 1],
        cashBalance: 0,
        totalCycles: 0,
        totalUsers: 0,
      },
    })
  }
  console.log('✅ 10 níveis criados/atualizados')

  // 2. Criar configuração do sistema
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      minQueueSize: 7,
      maxCyclesPerRun: 10,
      reservePercent: 10,
      operationalPercent: 10,
      bonusPercent: 40,
      profitPercent: 40,
      isMaintenanceMode: false,
      isProcessingEnabled: true,
    },
  })

  // 3. Criar fundos do sistema
  await prisma.systemFunds.upsert({
    where: { id: 1 },
    update: {},
    create: {
      reserve: 500,
      operational: 300,
      profit: 1000,
      totalIn: 5000,
      totalOut: 3200,
    },
  })

  // 4. Criar ADMIN como primeiro usuário do sistema
  console.log('\n👑 Criando ADMIN (primeiro usuário do sistema)...')
  const adminPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@7iatlas.com' },
    update: {
      name: 'Admin 7iATLAS',
      status: UserStatus.ACTIVE,
      currentLevel: 5,
      totalDeposited: 310,
      totalEarned: 1240,
      totalBonus: 520,
      balance: 1550,
    },
    create: {
      email: 'admin@7iatlas.com',
      passwordHash: adminPassword,
      walletAddress: '0x7iATLAS000000000000000000000000000000001',
      name: 'Admin 7iATLAS',
      referralCode: 'ADMIN7I',
      status: UserStatus.ACTIVE,
      currentLevel: 5,
      totalDeposited: 310,
      totalEarned: 1240,
      totalBonus: 520,
      balance: 1550,
      activatedAt: new Date('2025-01-01'),
    },
  })
  console.log(`✅ Admin criado: ${admin.email} (ID: ${admin.id})`)

  // 5. Criar usuários indicados diretos do admin (10 usuários)
  console.log('\n👥 Criando indicados diretos do admin...')
  const directReferrals: any[] = []

  for (let i = 0; i < 10; i++) {
    const password = await bcrypt.hash('teste123', 10)
    const user = await prisma.user.upsert({
      where: { email: `usuario${i + 1}@teste.com` },
      update: {},
      create: {
        email: `usuario${i + 1}@teste.com`,
        passwordHash: password,
        walletAddress: generateWallet(),
        name: NOMES[i],
        referralCode: generateReferralCode(),
        referrerId: admin.id,
        status: UserStatus.ACTIVE,
        currentLevel: Math.min(i + 1, 10),
        totalDeposited: LEVEL_CONFIG.ENTRY_VALUES[Math.min(i, 9)],
        totalEarned: LEVEL_CONFIG.REWARD_VALUES[Math.min(i, 9)] * (Math.floor(Math.random() * 3) + 1),
        totalBonus: Math.random() * 100,
        balance: Math.random() * 500 + 50,
        activatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    })
    directReferrals.push(user)
    console.log(`  ✅ ${user.name} (Nível ${user.currentLevel})`)
  }

  // 6. Criar mais usuários em cascata (indicados dos indicados)
  console.log('\n👥 Criando rede de indicados (2º e 3º grau)...')
  let allUsers = [admin, ...directReferrals]
  let userIndex = 10

  for (const referrer of directReferrals.slice(0, 5)) {
    // Cada um dos 5 primeiros indica 3-5 pessoas
    const numReferrals = Math.floor(Math.random() * 3) + 3

    for (let j = 0; j < numReferrals; j++) {
      if (userIndex >= NOMES.length) break

      const password = await bcrypt.hash('teste123', 10)
      const user = await prisma.user.create({
        data: {
          email: `usuario${userIndex + 1}@teste.com`,
          passwordHash: password,
          walletAddress: generateWallet(),
          name: NOMES[userIndex],
          referralCode: generateReferralCode(),
          referrerId: referrer.id,
          status: Math.random() > 0.2 ? UserStatus.ACTIVE : UserStatus.PENDING,
          currentLevel: Math.floor(Math.random() * 3) + 1,
          totalDeposited: Math.random() * 100 + 10,
          totalEarned: Math.random() * 200,
          totalBonus: Math.random() * 50,
          balance: Math.random() * 200 + 20,
          activatedAt: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) : null,
        },
      })
      allUsers.push(user)
      userIndex++
    }
  }
  console.log(`✅ ${allUsers.length} usuários criados no total`)

  // 7. Popular filas de cada nível
  console.log('\n📋 Populando filas dos níveis...')
  const levels = await prisma.level.findMany({ orderBy: { levelNumber: 'asc' } })

  for (const level of levels) {
    // Número de entradas na fila baseado no nível (mais pessoas nos níveis baixos)
    const queueSize = Math.max(3, 20 - level.levelNumber * 2)
    const usersForLevel = allUsers.slice(0, Math.min(queueSize, allUsers.length))

    let position = 1
    for (const user of usersForLevel) {
      // Alguns usuários têm múltiplas cotas
      const numQuotas = level.levelNumber <= 3 ? Math.floor(Math.random() * 3) + 1 : 1

      for (let q = 1; q <= numQuotas; q++) {
        // Verificar se já existe essa entrada
        const existing = await prisma.queueEntry.findFirst({
          where: {
            userId: user.id,
            levelId: level.id,
            quotaNumber: q,
          },
        })

        if (!existing) {
          const score = 1000 - position + Math.random() * 10
          await prisma.queueEntry.create({
            data: {
              userId: user.id,
              levelId: level.id,
              position,
              score,
              quotaNumber: q,
              reentries: Math.floor(Math.random() * 3),
              status: QueueStatus.WAITING,
              enteredAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            },
          })
          position++
        }
      }
    }

    // Atualizar total de usuários no nível
    await prisma.level.update({
      where: { id: level.id },
      data: {
        totalUsers: position - 1,
        cashBalance: LEVEL_CONFIG.ENTRY_VALUES[level.levelNumber - 1] * (position - 1) * 0.1,
      },
    })

    console.log(`  ✅ Nível ${level.levelNumber}: ${position - 1} entradas na fila`)
  }

  // 8. Criar histórico de ciclos
  console.log('\n🔄 Criando histórico de ciclos...')
  const cyclePositions = [
    CyclePosition.RECEIVER,
    CyclePosition.DONATE_1,
    CyclePosition.ADVANCE_1,
    CyclePosition.DONATE_2,
    CyclePosition.ADVANCE_2,
    CyclePosition.COMMUNITY,
    CyclePosition.REENTRY,
  ]

  for (const level of levels.slice(0, 5)) {
    // Criar 3-10 ciclos por nível
    const numCycles = Math.floor(Math.random() * 8) + 3

    for (let c = 0; c < numCycles; c++) {
      const cycleGroupId = `cycle_${level.levelNumber}_${c}`
      const usersInCycle = allUsers.slice(0, 7)

      for (let p = 0; p < 7; p++) {
        const user = usersInCycle[p % usersInCycle.length]
        const amount = p === 0 ? LEVEL_CONFIG.REWARD_VALUES[level.levelNumber - 1] :
                       p === 5 ? LEVEL_CONFIG.BONUS_VALUES[level.levelNumber - 1] : 0

        await prisma.cycleHistory.create({
          data: {
            userId: user.id,
            levelId: level.id,
            position: cyclePositions[p],
            amount,
            cycleGroupId,
            status: TransactionStatus.CONFIRMED,
            confirmedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
          },
        })
      }
    }

    // Atualizar total de ciclos
    await prisma.level.update({
      where: { id: level.id },
      data: { totalCycles: numCycles },
    })

    console.log(`  ✅ Nível ${level.levelNumber}: ${numCycles} ciclos completados`)
  }

  // 9. Criar transações
  console.log('\n💰 Criando histórico de transações...')

  for (const user of allUsers.slice(0, 20)) {
    // Depósito inicial
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: TransactionType.DEPOSIT,
        amount: user.totalDeposited || 10,
        status: TransactionStatus.CONFIRMED,
        description: 'Depósito inicial para ativação',
        confirmedAt: user.activatedAt || new Date(),
      },
    })

    // Ganhos de ciclo
    const numRewards = Math.floor(Math.random() * 5) + 1
    for (let r = 0; r < numRewards; r++) {
      const level = Math.min(user.currentLevel, 10)
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.CYCLE_REWARD,
          amount: LEVEL_CONFIG.REWARD_VALUES[level - 1],
          status: TransactionStatus.CONFIRMED,
          description: `Ciclo completado - Nível ${level}`,
          confirmedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        },
      })
    }

    // Bônus de indicação (para quem tem indicados)
    if (user.referrals && user.totalBonus > 0) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.BONUS_REFERRAL,
          amount: user.totalBonus,
          status: TransactionStatus.CONFIRMED,
          description: 'Bônus de indicação acumulado',
          confirmedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      })
    }
  }
  console.log('✅ Transações criadas')

  // 10. Criar transferências internas
  console.log('\n💸 Criando transferências internas...')

  for (let t = 0; t < 10; t++) {
    const fromUser = allUsers[Math.floor(Math.random() * 10)]
    const toUser = allUsers[Math.floor(Math.random() * allUsers.length)]

    if (fromUser.id !== toUser.id) {
      await prisma.internalTransfer.create({
        data: {
          fromUserId: fromUser.id,
          toUserId: toUser.id,
          amount: Math.floor(Math.random() * 50) + 10,
          status: 'COMPLETED',
          description: 'Transferência de teste',
        },
      })
    }
  }
  console.log('✅ 10 transferências internas criadas')

  // 11. Criar estatísticas dos níveis
  console.log('\n📈 Criando estatísticas dos níveis...')

  for (const level of levels) {
    await prisma.levelStats.upsert({
      where: { levelId: level.id },
      update: {
        totalCycles: level.totalCycles,
        cyclesToday: Math.floor(Math.random() * 5),
        avgCyclesPerDay: Math.random() * 3 + 1,
        avgWaitTime: Math.floor(Math.random() * 1440) + 60, // 1h a 24h em minutos
        lastCycleAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      },
      create: {
        levelId: level.id,
        totalCycles: level.totalCycles,
        cyclesToday: Math.floor(Math.random() * 5),
        avgCyclesPerDay: Math.random() * 3 + 1,
        avgWaitTime: Math.floor(Math.random() * 1440) + 60,
        lastCycleAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      },
    })
  }
  console.log('✅ Estatísticas criadas')

  // Resumo final
  console.log('\n' + '═'.repeat(60))
  console.log('🎉 SEED COMPLETO!')
  console.log('═'.repeat(60))

  const totalUsers = await prisma.user.count()
  const totalQueue = await prisma.queueEntry.count()
  const totalCycles = await prisma.cycleHistory.count()
  const totalTx = await prisma.transaction.count()

  console.log(`
📊 RESUMO DO SISTEMA:
───────────────────────────────────────
👤 Total de Usuários:     ${totalUsers}
📋 Entradas na Fila:      ${totalQueue}
🔄 Histórico de Ciclos:   ${totalCycles}
💰 Transações:            ${totalTx}
───────────────────────────────────────

🔑 CREDENCIAIS DE ACESSO:
───────────────────────────────────────
📧 Admin:    admin@7iatlas.com
🔐 Senha:    admin123

📧 Usuários: usuario1@teste.com até usuario${userIndex}@teste.com
🔐 Senha:    teste123
───────────────────────────────────────
`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erro no seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
