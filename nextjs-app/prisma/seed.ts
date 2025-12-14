import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar os 10 níveis
  const levels = []
  for (let i = 1; i <= 10; i++) {
    const entryValue = 10 * Math.pow(2, i - 1)
    const rewardValue = entryValue * 2
    const bonusValue = entryValue * 0.4

    levels.push({
      levelNumber: i,
      entryValue,
      rewardValue,
      bonusValue,
      cashBalance: 0,
      totalCycles: 0,
      totalUsers: 0,
    })
  }

  for (const level of levels) {
    await prisma.level.upsert({
      where: { levelNumber: level.levelNumber },
      update: level,
      create: level,
    })
    console.log(`✅ Nível ${level.levelNumber}: $${level.entryValue} → $${level.rewardValue}`)
  }

  // Criar configuração do sistema
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
  console.log('✅ Configuração do sistema criada')

  // Criar fundos do sistema
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
  console.log('✅ Fundos do sistema inicializados')

  console.log('')
  console.log('🎉 Seed concluído com sucesso!')
  console.log('')
  console.log('📊 Resumo dos Níveis:')
  console.log('─────────────────────────────────────────')
  console.log('Nível | Entrada | Ganho | Bônus | Acumulado')
  console.log('─────────────────────────────────────────')

  let accumulated = 0
  for (let i = 1; i <= 10; i++) {
    const entry = 10 * Math.pow(2, i - 1)
    const reward = entry * 2
    const bonus = entry * 0.4
    accumulated += reward
    console.log(`  ${i.toString().padStart(2)}   |  $${entry.toString().padStart(5)} |  $${reward.toString().padStart(5)} |  $${bonus.toString().padStart(5)} |  $${accumulated.toLocaleString()}`)
  }
  console.log('─────────────────────────────────────────')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
