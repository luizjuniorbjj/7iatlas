/**
 * 7iATLAS - Script de Setup do Banco de Dados de Teste
 *
 * Este script:
 * 1. Cria/reseta o banco de dados de teste
 * 2. Executa as migrations
 * 3. Popula com dados iniciais (seed)
 *
 * Uso: npx ts-node --transpile-only scripts/setup-test-db.ts
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

// Valores de entrada por nível (conforme documentação)
const LEVEL_VALUES = [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120]

async function main() {
  console.log('🔧 Configurando banco de dados de teste...\n')

  try {
    // 1. Reset do banco (se existir)
    console.log('1️⃣ Limpando banco de dados...')
    await cleanDatabase()

    // 2. Criar níveis
    console.log('2️⃣ Criando níveis (1-10)...')
    await createLevels()

    // 3. Criar configurações do sistema
    console.log('3️⃣ Criando configurações do sistema...')
    await createSystemConfig()

    // 4. Criar fundos do sistema
    console.log('4️⃣ Inicializando fundos do sistema...')
    await createSystemFunds()

    // 5. Criar usuários de teste
    console.log('5️⃣ Criando usuários de teste...')
    await createTestUsers()

    console.log('\n✅ Banco de dados de teste configurado com sucesso!')
    console.log('\n📊 Resumo:')

    const users = await prisma.user.count()
    const levels = await prisma.level.count()
    const queues = await prisma.queueEntry.count()

    console.log(`   - Usuários: ${users}`)
    console.log(`   - Níveis: ${levels}`)
    console.log(`   - Entradas na fila: ${queues}`)

  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function cleanDatabase() {
  // Deletar em ordem para respeitar foreign keys
  await prisma.notificationLog.deleteMany()
  await prisma.pushSubscription.deleteMany()
  await prisma.internalTransfer.deleteMany()
  await prisma.bonusHistory.deleteMany()
  await prisma.cycleHistory.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.queueEntry.deleteMany()
  await prisma.levelStats.deleteMany()
  await prisma.user.deleteMany()
  await prisma.level.deleteMany()
  await prisma.systemFunds.deleteMany()
  await prisma.systemConfig.deleteMany()

  console.log('   ✅ Banco limpo')
}

async function createLevels() {
  for (let i = 0; i < 10; i++) {
    const levelNumber = i + 1
    const entryValue = LEVEL_VALUES[i]

    await prisma.level.create({
      data: {
        levelNumber,
        entryValue,
        rewardValue: entryValue * 2,      // 2x entrada
        bonusValue: entryValue * 0.4,      // 40% entrada
        cashBalance: 0,
        totalCycles: 0,
        totalUsers: 0,
      }
    })
  }
  console.log('   ✅ 10 níveis criados')
}

async function createSystemConfig() {
  await prisma.systemConfig.create({
    data: {
      id: 1,
      minQueueSize: 7,
      maxCyclesPerRun: 50,
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
    }
  })
  console.log('   ✅ Configurações criadas')
}

async function createSystemFunds() {
  await prisma.systemFunds.create({
    data: {
      id: 1,
      reserve: 0,
      operational: 0,
      profit: 0,
      totalIn: 0,
      totalOut: 0,
    }
  })
  console.log('   ✅ Fundos do sistema inicializados')
}

async function createTestUsers() {
  const level1 = await prisma.level.findUnique({ where: { levelNumber: 1 } })
  if (!level1) throw new Error('Nível 1 não encontrado')

  // Criar usuário admin/líder
  const admin = await prisma.user.create({
    data: {
      email: 'admin@7iatlas.test',
      walletAddress: '0x' + '1'.repeat(40),
      name: 'Admin Teste',
      referralCode: 'ADMIN001',
      status: 'ACTIVE',
      activatedAt: new Date(),
      totalDeposited: 10,
      balance: 100, // Saldo para testes
    }
  })

  // Adicionar admin à fila do N1
  await prisma.queueEntry.create({
    data: {
      userId: admin.id,
      levelId: level1.id,
      score: 0,
      reentries: 0,
      quotaNumber: 1,
      status: 'WAITING',
    }
  })

  // Criar 10 usuários normais (indicados pelo admin)
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i}@7iatlas.test`,
        walletAddress: '0x' + i.toString().padStart(40, '0'),
        name: `Usuário Teste ${i}`,
        referralCode: `USER${i.toString().padStart(4, '0')}`,
        referrerId: admin.id,
        status: 'ACTIVE',
        activatedAt: new Date(),
        totalDeposited: 10,
        balance: 50,
      }
    })

    // Adicionar à fila do N1
    await prisma.queueEntry.create({
      data: {
        userId: user.id,
        levelId: level1.id,
        score: i * 10, // Scores diferentes para testar ordenação
        reentries: 0,
        quotaNumber: 1,
        status: 'WAITING',
      }
    })
  }

  // Atualizar caixa do N1 (11 pessoas × $10 = $110)
  await prisma.level.update({
    where: { levelNumber: 1 },
    data: {
      cashBalance: 110,
      totalUsers: 11,
    }
  })

  // Atualizar total depositado no sistema
  await prisma.systemFunds.update({
    where: { id: 1 },
    data: {
      totalIn: 110,
    }
  })

  console.log('   ✅ 11 usuários de teste criados')
  console.log('   ✅ Admin tem 10 indicados (tier 40%)')
}

// Executar
main()
