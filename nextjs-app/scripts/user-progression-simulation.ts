/**
 * 7iATLAS - Simulação de Progressão do Usuário
 * Estima quanto tempo leva para um usuário chegar ao nível 10
 *
 * ANÁLISE MATEMÁTICA:
 * - Cada ciclo precisa de 7 pessoas
 * - No ciclo: 1 avança (pos 0), 2 avançam sem ciclar (pos 2,4), 3 reentra (pos 1,3,6), 1 sai (pos 5)
 * - Para avançar: precisa ser RECEIVER (1/7 = 14.3%) OU AVANÇAR (2/7 = 28.6%)
 * - Chance de avançar por ciclo: 3/7 = 42.9%
 * - Precisa avançar 9 vezes para ir do nível 1 ao 10
 *
 * Execução: npx ts-node --transpile-only scripts/user-progression-simulation.ts
 */

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const CONFIG = {
  LEVEL_VALUES: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120],
  REWARD_MULTIPLIER: 2,
  CYCLE_SIZE: 7,
  MAX_LEVELS: 10,

  // Cenários de entrada diária de novos usuários
  DAILY_NEW_USERS: [
    { name: 'Baixo', value: 100 },
    { name: 'Médio', value: 500 },
    { name: 'Alto', value: 1000 },
    { name: 'Viral', value: 5000 },
  ],

  // Dias máximos de simulação
  MAX_DAYS: 365 * 3, // 3 anos
}

// ==========================================
// TIPOS
// ==========================================

interface LevelQueue {
  level: number
  queue: number[] // IDs dos usuários na fila
  totalCycles: number
}

interface TrackedUser {
  id: number
  joinedDay: number
  currentLevel: number
  cyclesCompleted: Map<number, number> // level -> cycles completed
  dayReachedLevel: Map<number, number> // level -> day reached
  totalEarned: number
  isFullyCompleted: boolean
}

interface SimulationResult {
  scenario: string
  dailyUsers: number
  trackedUsers: TrackedUser[]
  avgDaysToLevel10: number
  minDaysToLevel10: number
  maxDaysToLevel10: number
  completionRate: number
  avgDaysPerLevel: number[]
}

// ==========================================
// SIMULAÇÃO
// ==========================================

function runSimulation(dailyNewUsers: number, scenarioName: string): SimulationResult {
  const levels: LevelQueue[] = []
  for (let i = 1; i <= CONFIG.MAX_LEVELS; i++) {
    levels.push({ level: i, queue: [], totalCycles: 0 })
  }

  // Rastrear 100 usuários que entram no dia 1
  const trackedUsers: TrackedUser[] = []
  let userIdCounter = 0

  // Simula dias
  for (let day = 1; day <= CONFIG.MAX_DAYS; day++) {
    // 1. Adiciona novos usuários
    const newUsersToday = day === 1 ? dailyNewUsers + 100 : dailyNewUsers

    for (let i = 0; i < newUsersToday; i++) {
      const userId = ++userIdCounter

      // Adiciona à fila do nível 1
      levels[0].queue.push(userId)

      // Rastreia os primeiros 100 usuários do dia 1
      if (day === 1 && trackedUsers.length < 100) {
        trackedUsers.push({
          id: userId,
          joinedDay: day,
          currentLevel: 1,
          cyclesCompleted: new Map([[1, 0]]),
          dayReachedLevel: new Map([[1, day]]),
          totalEarned: 0,
          isFullyCompleted: false,
        })
      }
    }

    // 2. Processa ciclos em cada nível
    for (let levelIdx = 0; levelIdx < CONFIG.MAX_LEVELS; levelIdx++) {
      const level = levels[levelIdx]

      while (level.queue.length >= CONFIG.CYCLE_SIZE) {
        // Pega os 7 primeiros
        const participants = level.queue.splice(0, CONFIG.CYCLE_SIZE)
        level.totalCycles++

        const entryValue = CONFIG.LEVEL_VALUES[levelIdx]
        const rewardValue = entryValue * CONFIG.REWARD_MULTIPLIER

        // Processa cada posição
        for (let pos = 0; pos < 7; pos++) {
          const participantId = participants[pos]
          const tracked = trackedUsers.find(u => u.id === participantId)

          switch (pos) {
            case 0: // RECEIVER - ganha 2x, avança N+1, reentra N
              if (tracked) {
                tracked.totalEarned += rewardValue
                const currentCycles = tracked.cyclesCompleted.get(levelIdx + 1) || 0
                tracked.cyclesCompleted.set(levelIdx + 1, currentCycles + 1)
              }

              // Avança para próximo nível
              if (levelIdx < 9) {
                levels[levelIdx + 1].queue.push(participantId)
                if (tracked && !tracked.dayReachedLevel.has(levelIdx + 2)) {
                  tracked.dayReachedLevel.set(levelIdx + 2, day)
                  tracked.currentLevel = levelIdx + 2
                }
              } else {
                // Completou nível 10!
                if (tracked) {
                  tracked.isFullyCompleted = true
                }
              }

              // Reentra no mesmo nível
              level.queue.push(participantId)
              break

            case 1: // DOAR_1 - reentra
            case 3: // DOAR_2 - reentra
            case 6: // REENTRADA - reentra
              level.queue.push(participantId)
              break

            case 2: // AVANÇAR_1 - avança N+1
            case 4: // AVANÇAR_2 - avança N+1
              if (levelIdx < 9) {
                levels[levelIdx + 1].queue.push(participantId)
                if (tracked && !tracked.dayReachedLevel.has(levelIdx + 2)) {
                  tracked.dayReachedLevel.set(levelIdx + 2, day)
                  tracked.currentLevel = levelIdx + 2
                }
              }
              break

            case 5: // COMUNIDADE - sai do sistema
              // Não reentra
              break
          }
        }
      }
    }

    // Verifica se todos os rastreados completaram
    const allCompleted = trackedUsers.every(u => u.isFullyCompleted)
    if (allCompleted) {
      console.log(`  ✓ Todos os 100 usuários rastreados completaram no dia ${day}`)
      break
    }

    // Progress
    if (day % 30 === 0) {
      const completed = trackedUsers.filter(u => u.isFullyCompleted).length
      const avgLevel = trackedUsers.reduce((sum, u) => sum + u.currentLevel, 0) / trackedUsers.length
      process.stdout.write(`  Dia ${day}: ${completed}/100 completaram, nível médio: ${avgLevel.toFixed(1)}\r`)
    }
  }

  // Calcula estatísticas
  const completedUsers = trackedUsers.filter(u => u.isFullyCompleted)
  const daysToComplete = completedUsers.map(u => {
    const dayReached10 = u.dayReachedLevel.get(10) || CONFIG.MAX_DAYS
    return dayReached10 - u.joinedDay
  })

  const avgDaysToLevel10 = daysToComplete.length > 0
    ? daysToComplete.reduce((a, b) => a + b, 0) / daysToComplete.length
    : CONFIG.MAX_DAYS

  const minDaysToLevel10 = daysToComplete.length > 0 ? Math.min(...daysToComplete) : CONFIG.MAX_DAYS
  const maxDaysToLevel10 = daysToComplete.length > 0 ? Math.max(...daysToComplete) : CONFIG.MAX_DAYS

  // Tempo médio por nível
  const avgDaysPerLevel: number[] = []
  for (let level = 1; level <= 10; level++) {
    const daysToReach = trackedUsers
      .filter(u => u.dayReachedLevel.has(level))
      .map(u => (u.dayReachedLevel.get(level) || 0) - u.joinedDay)

    avgDaysPerLevel.push(
      daysToReach.length > 0 ? daysToReach.reduce((a, b) => a + b, 0) / daysToReach.length : 0
    )
  }

  return {
    scenario: scenarioName,
    dailyUsers: dailyNewUsers,
    trackedUsers,
    avgDaysToLevel10,
    minDaysToLevel10,
    maxDaysToLevel10,
    completionRate: (completedUsers.length / trackedUsers.length) * 100,
    avgDaysPerLevel,
  }
}

// ==========================================
// RELATÓRIO
// ==========================================

function generateReport(results: SimulationResult[]): void {
  console.log('\n')
  console.log('═'.repeat(100))
  console.log('           7iATLAS - ESTIMATIVA DE TEMPO PARA CHEGAR AO NÍVEL 10')
  console.log('═'.repeat(100))
  console.log(`\nData: ${new Date().toLocaleString('pt-BR')}`)
  console.log(`Usuários rastreados por cenário: 100`)
  console.log(`Simulação máxima: ${CONFIG.MAX_DAYS} dias (${(CONFIG.MAX_DAYS / 365).toFixed(1)} anos)`)
  console.log('\n')

  // Tabela resumo
  console.log('┌─────────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────────┐')
  console.log('│ Cenário         │ Usuários/Dia   │ Tempo Médio    │ Tempo Mínimo   │ Tempo Máximo   │ Taxa Conclusão │')
  console.log('├─────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┤')

  for (const result of results) {
    const avgTime = result.avgDaysToLevel10 < CONFIG.MAX_DAYS
      ? `${result.avgDaysToLevel10.toFixed(0)} dias`
      : 'N/A'
    const minTime = result.minDaysToLevel10 < CONFIG.MAX_DAYS
      ? `${result.minDaysToLevel10} dias`
      : 'N/A'
    const maxTime = result.maxDaysToLevel10 < CONFIG.MAX_DAYS
      ? `${result.maxDaysToLevel10} dias`
      : 'N/A'

    console.log(`│ ${result.scenario.padEnd(15)} │ ${result.dailyUsers.toString().padStart(14)} │ ${avgTime.padStart(14)} │ ${minTime.padStart(14)} │ ${maxTime.padStart(14)} │ ${(result.completionRate.toFixed(1) + '%').padStart(14)} │`)
  }

  console.log('└─────────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────────┘')

  // Detalhes por nível para cada cenário
  console.log('\n')
  console.log('═'.repeat(100))
  console.log('                    TEMPO MÉDIO PARA ALCANÇAR CADA NÍVEL')
  console.log('═'.repeat(100))

  for (const result of results) {
    console.log(`\n📊 Cenário: ${result.scenario} (${result.dailyUsers} usuários/dia)`)
    console.log('─'.repeat(80))

    console.log('\n┌─────────┬────────────────┬────────────────┬────────────────┬────────────────┐')
    console.log('│ Nível   │ Valor Entrada  │ Ganho (2x)     │ Dias p/ Chegar │ Dias Acumulado │')
    console.log('├─────────┼────────────────┼────────────────┼────────────────┼────────────────┤')

    for (let level = 1; level <= 10; level++) {
      const entryValue = CONFIG.LEVEL_VALUES[level - 1]
      const rewardValue = entryValue * 2
      const daysToReach = result.avgDaysPerLevel[level - 1]
      const prevDays = level > 1 ? result.avgDaysPerLevel[level - 2] : 0
      const daysThisLevel = daysToReach - prevDays

      console.log(`│ ${level.toString().padStart(7)} │ $${entryValue.toString().padStart(12)} │ $${rewardValue.toString().padStart(12)} │ ${(daysThisLevel > 0 ? '+' + daysThisLevel.toFixed(0) : '0').padStart(14)} │ ${daysToReach.toFixed(0).padStart(14)} │`)
    }

    console.log('└─────────┴────────────────┴────────────────┴────────────────┴────────────────┘')

    // Ganhos totais
    const totalInvestment = CONFIG.LEVEL_VALUES.reduce((a, b) => a + b, 0)
    const totalReward = totalInvestment * 2
    const profit = totalReward - totalInvestment

    console.log(`\n💰 Investimento total até nível 10: $${totalInvestment.toLocaleString('pt-BR')}`)
    console.log(`💎 Ganho total (todos os ciclos): $${totalReward.toLocaleString('pt-BR')}`)
    console.log(`📈 Lucro líquido: $${profit.toLocaleString('pt-BR')} (${((profit / totalInvestment) * 100).toFixed(0)}%)`)

    if (result.avgDaysToLevel10 < CONFIG.MAX_DAYS) {
      const monthsToComplete = result.avgDaysToLevel10 / 30
      console.log(`\n⏱️ Tempo médio para completar: ${result.avgDaysToLevel10.toFixed(0)} dias (~${monthsToComplete.toFixed(1)} meses)`)
    }
  }

  // Análise de ROI por tempo
  console.log('\n')
  console.log('═'.repeat(100))
  console.log('                           ANÁLISE DE RETORNO POR TEMPO')
  console.log('═'.repeat(100))

  const bestScenario = results.reduce((best, curr) =>
    curr.avgDaysToLevel10 < best.avgDaysToLevel10 ? curr : best
  )

  if (bestScenario.avgDaysToLevel10 < CONFIG.MAX_DAYS) {
    const totalInvestment = CONFIG.LEVEL_VALUES.reduce((a, b) => a + b, 0)
    const totalReward = totalInvestment * 2

    console.log(`\n🏆 Melhor cenário: ${bestScenario.scenario}`)
    console.log(`   • ${bestScenario.dailyUsers} novos usuários/dia`)
    console.log(`   • Tempo para nível 10: ${bestScenario.avgDaysToLevel10.toFixed(0)} dias`)
    console.log(`   • ROI diário: ${((totalReward - totalInvestment) / bestScenario.avgDaysToLevel10).toFixed(2)}$/dia`)
    console.log(`   • ROI mensal: ${(((totalReward - totalInvestment) / bestScenario.avgDaysToLevel10) * 30).toFixed(2)}$/mês`)
  }

  // Conclusão
  console.log('\n')
  console.log('═'.repeat(100))
  console.log('                                    CONCLUSÃO')
  console.log('═'.repeat(100))

  console.log('\n📋 FATORES QUE INFLUENCIAM O TEMPO:')
  console.log('   1. Volume de novos usuários diários (mais = mais rápido)')
  console.log('   2. Distribuição nas posições do ciclo (sorte)')
  console.log('   3. Score na fila (tempo de espera + reentradas + indicados)')
  console.log('   4. Níveis mais altos têm filas menores = mais lento')

  console.log('\n⚡ DICAS PARA PROGRESSÃO MAIS RÁPIDA:')
  console.log('   • Indicar amigos aumenta seu score em +10 por indicado')
  console.log('   • Reentradas automáticas aumentam score em +1.5')
  console.log('   • Entrar cedo no sistema garante vantagem de tempo')

  console.log('\n')
}

// ==========================================
// EXECUÇÃO
// ==========================================

async function main(): Promise<void> {
  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════╗')
  console.log('║              7iATLAS - SIMULAÇÃO DE PROGRESSÃO DO USUÁRIO                                    ║')
  console.log('║              Quanto tempo leva para chegar ao Nível 10?                                      ║')
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝')
  console.log('')

  const results: SimulationResult[] = []

  for (const scenario of CONFIG.DAILY_NEW_USERS) {
    console.log(`\n🚀 Simulando cenário: ${scenario.name} (${scenario.value} usuários/dia)`)
    const result = runSimulation(scenario.value, scenario.name)
    results.push(result)
  }

  generateReport(results)

  console.log('🏁 Simulação concluída!')
}

main().catch(console.error)
