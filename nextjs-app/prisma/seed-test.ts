import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ==========================================
// CONFIGURAÇÕES DE TESTE
// ==========================================

const TEST_PASSWORD = 'Test@123'
const TEST_PIN = '1234'

// Wallets de teste (não usar em produção!)
const TEST_WALLETS = {
  admin: '0xAdmin0000000000000000000000000000000001',
  leader: '0xLeader000000000000000000000000000000001',
  users: Array.from({ length: 50 }, (_, i) =>
    `0xUser${String(i + 1).padStart(39, '0')}`
  ),
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function generateReferralCode(name: string, index: number): string {
  return `${name.toUpperCase().slice(0, 3)}${String(index).padStart(3, '0')}`
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

// ==========================================
// SEED PRINCIPAL
// ==========================================

async function main() {
  console.log('🧪 Iniciando seed de TESTE do banco de dados...')
  console.log('⚠️  ATENÇÃO: Este seed é apenas para testes!\n')

  // 1. Criar os 10 níveis (se não existirem)
  console.log('📊 Criando níveis...')
  const levels = []
  for (let i = 1; i <= 10; i++) {
    const entryValue = 10 * Math.pow(2, i - 1)
    const rewardValue = entryValue * 2
    const bonusValue = entryValue * 0.4

    const level = await prisma.level.upsert({
      where: { levelNumber: i },
      update: {
        entryValue,
        rewardValue,
        bonusValue,
      },
      create: {
        levelNumber: i,
        entryValue,
        rewardValue,
        bonusValue,
        cashBalance: 0,
        totalCycles: 0,
        totalUsers: 0,
      },
    })
    levels.push(level)
    console.log(`  ✅ Nível ${i}: $${entryValue} → $${rewardValue}`)
  }

  // 2. Criar configuração do sistema
  console.log('\n⚙️ Criando configuração do sistema...')
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
      transferLimitNoKyc: 100,
      transferLimitKyc: 1000,
      transferMinAmount: 10,
      transferMaxPerDay: 3,
      isMaintenanceMode: false,
      isProcessingEnabled: true,
    },
  })
  console.log('  ✅ Configuração criada')

  // 3. Criar fundos do sistema
  console.log('\n💰 Inicializando fundos do sistema...')
  await prisma.systemFunds.upsert({
    where: { id: 1 },
    update: {},
    create: {
      reserve: 0,
      operational: 0,
      profit: 0,
      totalIn: 0,
      totalOut: 0,
    },
  })
  console.log('  ✅ Fundos inicializados')

  // 4. Criar estatísticas de níveis
  console.log('\n📈 Criando estatísticas de níveis...')
  for (const level of levels) {
    await prisma.levelStats.upsert({
      where: { levelId: level.id },
      update: {},
      create: {
        levelId: level.id,
        totalCycles: 0,
        cyclesToday: 0,
        avgCyclesPerDay: 0,
        avgWaitTime: 0,
      },
    })
  }
  console.log('  ✅ Estatísticas criadas para todos os níveis')

  // 5. Criar usuário admin
  console.log('\n👤 Criando usuário ADMIN...')
  const passwordHash = await hashPassword(TEST_PASSWORD)
  const pinHash = await hashPin(TEST_PIN)

  const admin = await prisma.user.upsert({
    where: { walletAddress: TEST_WALLETS.admin },
    update: {},
    create: {
      email: 'admin@7iatlas.com',
      passwordHash,
      walletAddress: TEST_WALLETS.admin,
      name: 'Administrador',
      referralCode: 'ADMIN001',
      status: 'ACTIVE',
      currentLevel: 1,
      totalDeposited: 100,
      totalEarned: 0,
      totalBonus: 0,
      totalWithdrawn: 0,
      balance: 1000, // Saldo para testes
      pinHash,
      pinCreatedAt: new Date(),
      notifyEmail: true,
      notifyPush: true,
      activatedAt: new Date(),
    },
  })
  console.log(`  ✅ Admin criado: ${admin.email} (${admin.referralCode})`)

  // 6. Criar usuário LÍDER (com muitos indicados)
  console.log('\n🏆 Criando usuário LÍDER...')
  const leader = await prisma.user.upsert({
    where: { walletAddress: TEST_WALLETS.leader },
    update: {},
    create: {
      email: 'leader@7iatlas.com',
      passwordHash,
      walletAddress: TEST_WALLETS.leader,
      name: 'Líder Top',
      referralCode: 'LEADER01',
      status: 'ACTIVE',
      currentLevel: 3,
      totalDeposited: 500,
      totalEarned: 200,
      totalBonus: 150,
      totalWithdrawn: 0,
      balance: 500,
      pinHash,
      pinCreatedAt: new Date(),
      notifyEmail: true,
      notifyPush: true,
      activatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    },
  })
  console.log(`  ✅ Líder criado: ${leader.email} (${leader.referralCode})`)

  // 7. Criar usuários de teste com diferentes cenários
  console.log('\n👥 Criando usuários de teste...')
  const testUsers: any[] = []

  // Cenário 1: 10 usuários ATIVOS indicados pelo Líder (na fila Nível 1)
  console.log('  📋 Cenário 1: 10 usuários ativos indicados pelo Líder...')
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.upsert({
      where: { walletAddress: TEST_WALLETS.users[i - 1] },
      update: {},
      create: {
        email: `user${i}@test.com`,
        passwordHash,
        walletAddress: TEST_WALLETS.users[i - 1],
        name: `Usuário Teste ${i}`,
        referralCode: generateReferralCode('USR', i),
        referrerId: leader.id,
        status: 'ACTIVE',
        currentLevel: 1,
        totalDeposited: 10,
        totalEarned: 0,
        totalBonus: 0,
        balance: 50,
        pinHash,
        pinCreatedAt: new Date(),
        activatedAt: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000), // Diferentes tempos de ativação
      },
    })
    testUsers.push(user)
    console.log(`    ✅ ${user.name} (${user.referralCode})`)
  }

  // Cenário 2: 5 usuários PENDING (ainda não depositaram)
  console.log('  📋 Cenário 2: 5 usuários pendentes...')
  for (let i = 11; i <= 15; i++) {
    const user = await prisma.user.upsert({
      where: { walletAddress: TEST_WALLETS.users[i - 1] },
      update: {},
      create: {
        email: `pending${i}@test.com`,
        passwordHash,
        walletAddress: TEST_WALLETS.users[i - 1],
        name: `Pendente ${i}`,
        referralCode: generateReferralCode('PND', i),
        referrerId: testUsers[0]?.id, // Indicado pelo User 1
        status: 'PENDING',
        currentLevel: 1,
        totalDeposited: 0,
      },
    })
    console.log(`    ⏳ ${user.name} (${user.referralCode}) - PENDENTE`)
  }

  // Cenário 3: 5 usuários para completar a matriz (7 total no nível 1)
  console.log('  📋 Cenário 3: Mais 5 usuários para matriz...')
  for (let i = 16; i <= 20; i++) {
    const user = await prisma.user.upsert({
      where: { walletAddress: TEST_WALLETS.users[i - 1] },
      update: {},
      create: {
        email: `matrix${i}@test.com`,
        passwordHash,
        walletAddress: TEST_WALLETS.users[i - 1],
        name: `Matrix User ${i}`,
        referralCode: generateReferralCode('MTX', i),
        referrerId: leader.id,
        status: 'ACTIVE',
        currentLevel: 1,
        totalDeposited: 10,
        balance: 20,
        activatedAt: new Date(Date.now() - (10 - (i - 16)) * 24 * 60 * 60 * 1000),
      },
    })
    testUsers.push(user)
    console.log(`    ✅ ${user.name} (${user.referralCode})`)
  }

  // 8. Adicionar usuários à fila do Nível 1
  console.log('\n📊 Adicionando usuários às filas...')

  // Adicionar Líder à fila com múltiplas cotas
  console.log('  🏆 Adicionando Líder com 3 cotas no Nível 1...')
  for (let quota = 1; quota <= 3; quota++) {
    await prisma.queueEntry.create({
      data: {
        userId: leader.id,
        levelId: levels[0].id, // Nível 1
        status: 'WAITING',
        score: 100 + (3 - quota) * 10, // Cotas mais antigas têm mais score
        quotaNumber: quota,
        reentries: quota - 1,
        enteredAt: new Date(Date.now() - (30 - quota * 5) * 24 * 60 * 60 * 1000),
      },
    })
    console.log(`    ✅ Cota ${quota} do Líder adicionada`)
  }

  // Adicionar primeiros 10 usuários à fila Nível 1
  console.log('  👥 Adicionando usuários ativos à fila...')
  for (let i = 0; i < 10; i++) {
    const user = testUsers[i]
    if (!user) continue

    await prisma.queueEntry.create({
      data: {
        userId: user.id,
        levelId: levels[0].id,
        status: 'WAITING',
        score: 50 - i * 2, // Score decrescente
        quotaNumber: 1,
        reentries: 0,
        enteredAt: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000),
      },
    })
  }
  console.log('    ✅ 10 usuários adicionados à fila')

  // Adicionar usuários matrix (16-20) à fila
  for (let i = 10; i < testUsers.length; i++) {
    const user = testUsers[i]
    if (!user) continue

    await prisma.queueEntry.create({
      data: {
        userId: user.id,
        levelId: levels[0].id,
        status: 'WAITING',
        score: 30 - (i - 10) * 2,
        quotaNumber: 1,
        reentries: 0,
        enteredAt: new Date(Date.now() - (10 - (i - 10)) * 24 * 60 * 60 * 1000),
      },
    })
  }
  console.log('    ✅ 5 usuários matrix adicionados à fila')

  // 9. Adicionar Líder à fila do Nível 2 e 3
  console.log('\n  🏆 Adicionando Líder aos níveis 2 e 3...')
  await prisma.queueEntry.create({
    data: {
      userId: leader.id,
      levelId: levels[1].id, // Nível 2
      status: 'WAITING',
      score: 80,
      quotaNumber: 1,
      reentries: 1,
      enteredAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    },
  })
  await prisma.queueEntry.create({
    data: {
      userId: leader.id,
      levelId: levels[2].id, // Nível 3
      status: 'WAITING',
      score: 50,
      quotaNumber: 1,
      reentries: 0,
      enteredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  })
  console.log('    ✅ Líder adicionado aos níveis 2 e 3')

  // 10. Atualizar cashBalance dos níveis
  console.log('\n💵 Atualizando caixa dos níveis...')

  // Nível 1: 18 pessoas na fila × $10 = $180 (suficiente para 2 ciclos)
  await prisma.level.update({
    where: { levelNumber: 1 },
    data: {
      cashBalance: 180,
      totalUsers: 18,
    },
  })
  console.log('  ✅ Nível 1: $180 (18 pessoas na fila)')

  // Nível 2: $40 (2 pessoas)
  await prisma.level.update({
    where: { levelNumber: 2 },
    data: {
      cashBalance: 40,
      totalUsers: 1,
    },
  })
  console.log('  ✅ Nível 2: $40 (1 pessoa na fila)')

  // Nível 3: $40
  await prisma.level.update({
    where: { levelNumber: 3 },
    data: {
      cashBalance: 40,
      totalUsers: 1,
    },
  })
  console.log('  ✅ Nível 3: $40 (1 pessoa na fila)')

  // 11. Criar algumas transações de exemplo
  console.log('\n📝 Criando transações de exemplo...')

  // Depósitos
  for (const user of testUsers.slice(0, 5)) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'DEPOSIT',
        amount: 10,
        txHash: `0xdeposit${user.id.slice(0, 8)}`,
        status: 'CONFIRMED',
        confirmedAt: user.activatedAt,
        description: 'Depósito inicial - Ativação',
      },
    })
  }
  console.log('  ✅ 5 transações de depósito criadas')

  // 12. Criar histórico de ciclos de exemplo
  console.log('\n🔄 Criando histórico de ciclos de exemplo...')
  const cycleGroupId = `cycle_test_${Date.now()}`

  await prisma.cycleHistory.create({
    data: {
      userId: leader.id,
      levelId: levels[0].id,
      position: 'RECEIVER',
      amount: 20,
      cycleGroupId,
      status: 'CONFIRMED',
      confirmedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  })
  console.log('  ✅ 1 ciclo histórico criado')

  // 13. Criar bônus de indicação de exemplo
  console.log('\n🎁 Criando bônus de indicação de exemplo...')
  await prisma.bonusHistory.create({
    data: {
      referrerId: leader.id,
      referredId: testUsers[0].id,
      levelId: levels[0].id,
      amount: 4,
      status: 'CONFIRMED',
      confirmedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  })
  console.log('  ✅ 1 bônus de indicação criado')

  // 14. Criar transferência interna de exemplo
  console.log('\n💸 Criando transferência interna de exemplo...')
  if (testUsers.length >= 2) {
    await prisma.internalTransfer.create({
      data: {
        fromUserId: leader.id,
        toUserId: testUsers[0].id,
        amount: 20,
        status: 'COMPLETED',
        description: 'Ajuda para começar',
      },
    })
    console.log('  ✅ 1 transferência interna criada')
  }

  // 15. Atualizar totais do sistema
  console.log('\n📊 Atualizando totais do sistema...')
  await prisma.systemFunds.update({
    where: { id: 1 },
    data: {
      totalIn: 260, // Total de depósitos simulados
      totalOut: 20, // Pagamentos simulados
      reserve: 2,
      operational: 2,
      profit: 8,
    },
  })
  console.log('  ✅ Totais do sistema atualizados')

  // 16. Resumo final
  console.log('\n' + '═'.repeat(60))
  console.log('🎉 SEED DE TESTE CONCLUÍDO COM SUCESSO!')
  console.log('═'.repeat(60))

  console.log('\n📊 RESUMO DOS DADOS CRIADOS:')
  console.log('─'.repeat(60))
  console.log('│ Níveis:              10 níveis ($10 a $5,120)')
  console.log('│ Usuário Admin:       admin@7iatlas.com')
  console.log('│ Usuário Líder:       leader@7iatlas.com (15 indicados)')
  console.log('│ Usuários Ativos:     15 (na fila)')
  console.log('│ Usuários Pendentes:  5 (aguardando depósito)')
  console.log('│ Entradas na Fila:    18 (Nível 1) + 1 (N2) + 1 (N3)')
  console.log('│ Caixa Nível 1:       $180 (suficiente para 2 ciclos)')
  console.log('─'.repeat(60))

  console.log('\n🔐 CREDENCIAIS DE TESTE:')
  console.log('─'.repeat(60))
  console.log(`│ Senha padrão:        ${TEST_PASSWORD}`)
  console.log(`│ PIN padrão:          ${TEST_PIN}`)
  console.log('─'.repeat(60))

  console.log('\n📧 EMAILS DE TESTE:')
  console.log('─'.repeat(60))
  console.log('│ Admin:               admin@7iatlas.com')
  console.log('│ Líder:               leader@7iatlas.com')
  console.log('│ Usuários:            user1@test.com até user10@test.com')
  console.log('│ Pendentes:           pending11@test.com até pending15@test.com')
  console.log('│ Matrix:              matrix16@test.com até matrix20@test.com')
  console.log('─'.repeat(60))

  console.log('\n🧪 CENÁRIOS PRONTOS PARA TESTE:')
  console.log('─'.repeat(60))
  console.log('│ 1. ✅ Login com email/senha')
  console.log('│ 2. ✅ Dashboard com dados reais')
  console.log('│ 3. ✅ Visualização de fila (18 pessoas no N1)')
  console.log('│ 4. ✅ Sistema de bônus de indicação')
  console.log('│ 5. ✅ Múltiplas cotas (Líder tem 3 no N1)')
  console.log('│ 6. ✅ Níveis superiores (Líder nos N1, N2, N3)')
  console.log('│ 7. ✅ Transferências internas')
  console.log('│ 8. ✅ Processamento de ciclo (caixa suficiente)')
  console.log('│ 9. ⏳ Ativação de usuário pendente')
  console.log('─'.repeat(60))

  console.log('\n⚡ PRÓXIMOS PASSOS:')
  console.log('─'.repeat(60))
  console.log('│ 1. Execute: npm run dev')
  console.log('│ 2. Acesse: http://localhost:3000')
  console.log('│ 3. Faça login com: admin@7iatlas.com / Test@123')
  console.log('│ 4. Teste as funcionalidades no dashboard')
  console.log('│ 5. Execute: POST /api/cron/process-cycles para ciclar')
  console.log('─'.repeat(60))
  console.log('')
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
