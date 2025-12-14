/**
 * 7iATLAS - Jupiter Pool Simulation
 * Simulação matemática completa comparando sistema com e sem Jupiter Pool
 *
 * Execução: npx ts-node scripts/jupiter-pool-simulation.ts
 */

// ==========================================
// CONFIGURAÇÕES DO SISTEMA
// ==========================================

const CONFIG = {
  // Valores dos níveis (10 * 2^(level-1))
  LEVEL_VALUES: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120],

  // Ganho: 2x o valor de entrada (100% lucro)
  REWARD_MULTIPLIER: 2,

  // Máximo de cotas por nível por usuário
  MAX_QUOTAS_PER_LEVEL: 10,

  // Participantes por ciclo (matriz 6x1 + recebedor)
  CYCLE_SIZE: 7,

  // Distribuição Posição 5 (%)
  POSITION_5: {
    RESERVE: 10,
    OPERATIONAL: 10,
    BONUS: 40,
    PROFIT: 40,
  },

  // Jupiter Pool (% do ganho do recebedor)
  JUPITER_POOL_PERCENT: 10,

  // Justice Score weights
  JUSTICE_WEIGHTS: {
    TIME: 3,        // Tempo de espera (dias)
    USERS: 2,       // Usuários afetados
    PROXIMITY: 1.5, // Proximidade do ciclo
    IMPACT: 2,      // Potencial de destravamento
  },

  // Triggers de intervenção (dias sem ciclo)
  INTERVENTION_TRIGGERS: {
    YELLOW: 3,
    ORANGE: 5,
    RED: 7,
  },

  // Simulação
  SIMULATION_DAYS: 180,  // 6 meses para teste completo
  MAX_USERS: 100000,     // 100.000 usuários
}

// ==========================================
// TIPOS
// ==========================================

interface User {
  id: number
  balance: number
  totalEarned: number
  totalDeposited: number
  referrerId: number | null
  joinedDay: number
  quotas: Map<number, QuotaEntry[]> // level -> quotas
  activeReferralsCount: number // Cache de indicados ativos para otimização
}

interface QuotaEntry {
  id: number
  userId: number
  level: number
  score: number
  enteredDay: number
  reentries: number
  status: 'WAITING' | 'COMPLETED'
}

interface LevelState {
  level: number
  queue: QuotaEntry[]
  totalCycles: number
  lastCycleDay: number
  daysSinceLastCycle: number
}

interface SystemFunds {
  reserve: number
  operational: number
  bonus: number
  profit: number
  jupiterPool: number
}

interface DailyMetrics {
  day: number
  newUsers: number
  totalUsers: number
  cyclesPerLevel: number[]
  avgWaitTimePerLevel: number[]
  queueSizePerLevel: number[]
  jupiterPoolBalance: number
  interventions: number
  totalEarnings: number
  stuckLevels: number[]
}

interface SimulationResult {
  name: string
  withJupiterPool: boolean
  scenario: string
  metrics: DailyMetrics[]
  finalStats: {
    totalUsers: number
    totalCycles: number
    totalEarnings: number
    avgWaitTime: number
    maxWaitTime: number
    stuckLevels: number
    jupiterPoolUsed: number
    interventionCount: number
  }
}

// ==========================================
// CENÁRIOS DE TESTE
// ==========================================

interface Scenario {
  name: string
  code: string
  description: string
  getUsersPerDay: (day: number) => number
}

const SCENARIOS: Scenario[] = [
  {
    name: 'Crise Extrema 100K',
    code: 'A',
    description: '100.000 usuários em 60 dias, depois 60 dias SEM NENHUM novo, depois recuperação',
    getUsersPerDay: (day) => {
      // Fase 1: Crescimento massivo (dias 1-60) - ~1.667 usuários/dia = 100.000 total
      if (day <= 60) return 1667
      // Fase 2: CRISE TOTAL (dias 61-120) - ZERO novos usuários por 60 dias
      if (day <= 120) return 0
      // Fase 3: Recuperação lenta (dias 121-180) - 50 usuários/dia
      return 50
    },
  },
]

// ==========================================
// CLASSE DE SIMULAÇÃO
// ==========================================

class MatrixSimulation {
  private users: Map<number, User> = new Map()
  private levels: LevelState[] = []
  private funds: SystemFunds = {
    reserve: 0,
    operational: 0,
    bonus: 0,
    profit: 0,
    jupiterPool: 0,
  }
  private metrics: DailyMetrics[] = []
  private quotaIdCounter = 0
  private userIdCounter = 0
  private withJupiterPool: boolean
  private scenario: Scenario
  private currentDay = 0
  private interventionCount = 0
  private jupiterPoolUsed = 0

  constructor(withJupiterPool: boolean, scenario: Scenario) {
    this.withJupiterPool = withJupiterPool
    this.scenario = scenario
    this.initializeLevels()
  }

  private initializeLevels(): void {
    for (let i = 0; i < 10; i++) {
      this.levels.push({
        level: i + 1,
        queue: [],
        totalCycles: 0,
        lastCycleDay: 0,
        daysSinceLastCycle: 0,
      })
    }
  }

  private calculateScore(entry: QuotaEntry, currentDay: number): number {
    const waitDays = currentDay - entry.enteredDay
    const user = this.users.get(entry.userId)!

    // Usa cache de indicados ao invés de recalcular O(n)
    const referralCount = user?.activeReferralsCount || 0

    // Score = (tempo_espera × 2) + (reentradas × 1.5) + (indicados × 10)
    return waitDays * 2 + entry.reentries * 1.5 + referralCount * 10
  }

  // OTIMIZAÇÃO: Atualiza scores apenas para os níveis que serão processados
  // e usa cache de indicados para evitar O(n²)
  private updateScoresForLevel(levelIndex: number): void {
    const level = this.levels[levelIndex]

    // Atualiza scores apenas se há participantes suficientes para ciclo
    if (level.queue.length < CONFIG.CYCLE_SIZE) return

    // Atualiza scores em batch (O(n) para o nível, não para todos os usuários)
    for (const entry of level.queue) {
      entry.score = this.calculateScore(entry, this.currentDay)
    }

    // Ordena por score (maior primeiro)
    level.queue.sort((a, b) => b.score - a.score)
  }

  // Versão lazy: atualiza scores apenas quando necessário
  private updateAllScores(): void {
    // OTIMIZAÇÃO: Atualiza apenas níveis com participantes suficientes
    for (let i = 0; i < this.levels.length; i++) {
      if (this.levels[i].queue.length >= CONFIG.CYCLE_SIZE) {
        this.updateScoresForLevel(i)
      }
    }
  }

  private createUser(referrerId: number | null = null): User {
    const id = ++this.userIdCounter
    const user: User = {
      id,
      balance: 0,
      totalEarned: 0,
      totalDeposited: 0,
      referrerId,
      joinedDay: this.currentDay,
      quotas: new Map(),
      activeReferralsCount: 0,
    }
    this.users.set(id, user)

    // OTIMIZAÇÃO: Atualiza cache de indicados do referrer imediatamente
    if (referrerId !== null) {
      const referrer = this.users.get(referrerId)
      if (referrer) {
        referrer.activeReferralsCount++
      }
    }

    return user
  }

  private purchaseQuota(user: User, level: number): boolean {
    const value = CONFIG.LEVEL_VALUES[level - 1]

    // Verifica limite de cotas
    const currentQuotas = user.quotas.get(level) || []
    if (currentQuotas.length >= CONFIG.MAX_QUOTAS_PER_LEVEL) {
      return false
    }

    // Adiciona saldo inicial se for primeira compra
    if (user.totalDeposited === 0) {
      user.balance = value * 2 // Saldo inicial para teste
    }

    if (user.balance < value) {
      return false
    }

    // Debita do usuário
    user.balance -= value
    user.totalDeposited += value

    // Cria entrada na fila
    const entry: QuotaEntry = {
      id: ++this.quotaIdCounter,
      userId: user.id,
      level,
      score: 0,
      enteredDay: this.currentDay,
      reentries: 0,
      status: 'WAITING',
    }

    // Adiciona à fila do nível
    this.levels[level - 1].queue.push(entry)

    // Registra no usuário
    if (!user.quotas.has(level)) {
      user.quotas.set(level, [])
    }
    user.quotas.get(level)!.push(entry)

    return true
  }

  private processCycle(levelIndex: number): boolean {
    const level = this.levels[levelIndex]

    if (level.queue.length < CONFIG.CYCLE_SIZE) {
      return false
    }

    // Pega os 7 primeiros da fila (por score)
    const participants = level.queue.splice(0, CONFIG.CYCLE_SIZE)
    const entryValue = CONFIG.LEVEL_VALUES[levelIndex]
    const rewardValue = entryValue * CONFIG.REWARD_MULTIPLIER

    // Processa cada posição conforme documentação técnica:
    // Pos 0 (Receiver): ganha 2x, avança N+1, REENTRA N
    // Pos 1 (Doar): doa para receiver, REENTRA N
    // Pos 2 (Avançar): avança N+1
    // Pos 3 (Doar): doa para receiver, REENTRA N
    // Pos 4 (Avançar): avança N+1
    // Pos 5 (Comunidade): distribui, NÃO reentra
    // Pos 6 (Reentrada): REENTRA N

    for (let pos = 0; pos < 7; pos++) {
      const entry = participants[pos]
      entry.status = 'COMPLETED'

      // Pula entradas do sistema (Jupiter Pool virtual entries)
      if (entry.userId === -1) {
        continue
      }

      const user = this.users.get(entry.userId)!

      switch (pos) {
        case 0: // RECEIVER - ganha 2x, avança N+1, reentra N
          let reward = rewardValue

          // Se Jupiter Pool ativo, deduz 10% do ganho
          if (this.withJupiterPool) {
            const jupiterContribution = reward * (CONFIG.JUPITER_POOL_PERCENT / 100)
            this.funds.jupiterPool += jupiterContribution
            reward -= jupiterContribution
          }

          user.balance += reward
          user.totalEarned += reward

          // AVANÇA para próximo nível (N+1)
          if (levelIndex < 9) {
            const advanceEntry: QuotaEntry = {
              id: ++this.quotaIdCounter,
              userId: user.id,
              level: levelIndex + 2,
              score: 0,
              enteredDay: this.currentDay,
              reentries: 0,
              status: 'WAITING',
            }
            this.levels[levelIndex + 1].queue.push(advanceEntry)
            if (!user.quotas.has(levelIndex + 2)) {
              user.quotas.set(levelIndex + 2, [])
            }
            user.quotas.get(levelIndex + 2)!.push(advanceEntry)
          }

          // REENTRA no mesmo nível (N)
          {
            const reentry: QuotaEntry = {
              id: ++this.quotaIdCounter,
              userId: user.id,
              level: levelIndex + 1,
              score: 0,
              enteredDay: this.currentDay,
              reentries: entry.reentries + 1,
              status: 'WAITING',
            }
            level.queue.push(reentry)
            user.quotas.get(levelIndex + 1)!.push(reentry)
          }
          break

        case 1: // DOAR_1 - doa para receiver, REENTRA no mesmo nível
        case 3: // DOAR_2 - doa para receiver, REENTRA no mesmo nível
          // Valor já foi contabilizado no receiver
          // REENTRA no mesmo nível (N)
          {
            const reentry: QuotaEntry = {
              id: ++this.quotaIdCounter,
              userId: user.id,
              level: levelIndex + 1,
              score: 0,
              enteredDay: this.currentDay,
              reentries: entry.reentries + 1,
              status: 'WAITING',
            }
            level.queue.push(reentry)
            user.quotas.get(levelIndex + 1)!.push(reentry)
          }
          break

        case 2: // AVANÇAR_1 - avança para próximo nível, NÃO reentra
        case 4: // AVANÇAR_2 - avança para próximo nível, NÃO reentra
          if (levelIndex < 9) {
            const nextEntry: QuotaEntry = {
              id: ++this.quotaIdCounter,
              userId: user.id,
              level: levelIndex + 2,
              score: 0,
              enteredDay: this.currentDay,
              reentries: 0,
              status: 'WAITING',
            }
            this.levels[levelIndex + 1].queue.push(nextEntry)
            if (!user.quotas.has(levelIndex + 2)) {
              user.quotas.set(levelIndex + 2, [])
            }
            user.quotas.get(levelIndex + 2)!.push(nextEntry)
          }
          break

        case 5: // COMUNIDADE - distribui para fundos, NÃO reentra
          const communityValue = entryValue
          this.funds.reserve += communityValue * (CONFIG.POSITION_5.RESERVE / 100)
          this.funds.operational += communityValue * (CONFIG.POSITION_5.OPERATIONAL / 100)
          this.funds.bonus += communityValue * (CONFIG.POSITION_5.BONUS / 100)
          this.funds.profit += communityValue * (CONFIG.POSITION_5.PROFIT / 100)
          // NÃO reentra - sai do sistema
          break

        case 6: // REENTRADA - REENTRA no mesmo nível
          {
            const reentry: QuotaEntry = {
              id: ++this.quotaIdCounter,
              userId: user.id,
              level: levelIndex + 1,
              score: 0,
              enteredDay: this.currentDay,
              reentries: entry.reentries + 1,
              status: 'WAITING',
            }
            level.queue.push(reentry)
            user.quotas.get(levelIndex + 1)!.push(reentry)
          }
          break
      }
    }

    level.totalCycles++
    level.lastCycleDay = this.currentDay
    level.daysSinceLastCycle = 0

    return true
  }

  private calculateJusticeScore(levelIndex: number): number {
    const level = this.levels[levelIndex]
    if (level.queue.length === 0) return 0

    const weights = CONFIG.JUSTICE_WEIGHTS

    // Tempo médio de espera (dias)
    const avgWait = level.queue.reduce((sum, e) => sum + (this.currentDay - e.enteredDay), 0) / level.queue.length

    // Usuários únicos afetados
    const uniqueUsers = new Set(level.queue.map(e => e.userId)).size

    // Proximidade do ciclo (% para completar)
    const proximity = (level.queue.length / CONFIG.CYCLE_SIZE) * 100

    // Impacto potencial (quanto dinheiro seria desbloqueado)
    const potentialUnlock = Math.min(level.queue.length, CONFIG.CYCLE_SIZE) * CONFIG.LEVEL_VALUES[levelIndex] * 2

    return (
      avgWait * weights.TIME +
      uniqueUsers * weights.USERS +
      proximity * weights.PROXIMITY +
      (potentialUnlock / 1000) * weights.IMPACT
    )
  }

  private executeJupiterIntervention(): void {
    if (!this.withJupiterPool || this.funds.jupiterPool < 10) return

    // ESTRATÉGIA: Usar Jupiter Pool para INCENTIVAR novos usuários
    // através de "bolsas" que subsidiam entrada em níveis travados

    // Encontra níveis travados ordenados por Justice Score
    const stuckLevels = this.levels
      .map((level, index) => ({
        index,
        level,
        justiceScore: this.calculateJusticeScore(index),
        daysSince: level.daysSinceLastCycle,
        queueSize: level.queue.length,
      }))
      .filter(l => {
        // Só intervém se:
        // 1. Está travado por tempo suficiente (3+ dias)
        // 2. Tem pessoas na fila esperando
        // 3. Faltam até 4 pessoas para completar ciclo
        const needed = CONFIG.CYCLE_SIZE - l.queueSize
        return l.daysSince >= CONFIG.INTERVENTION_TRIGGERS.YELLOW &&
               l.queueSize >= 3 && // Pelo menos 3 pessoas já esperando
               l.queueSize < CONFIG.CYCLE_SIZE &&
               needed <= 4
      })
      .sort((a, b) => {
        // Prioriza: mais pessoas esperando primeiro
        if (a.queueSize !== b.queueSize) return b.queueSize - a.queueSize
        return b.justiceScore - a.justiceScore
      })

    // Processa até 2 níveis por dia
    let interventionsToday = 0
    const maxInterventionsPerDay = 2

    for (const stuck of stuckLevels) {
      if (interventionsToday >= maxInterventionsPerDay) break

      const needed = CONFIG.CYCLE_SIZE - stuck.level.queue.length
      if (needed <= 0) continue

      const entryValue = CONFIG.LEVEL_VALUES[stuck.index]
      const costPerEntry = entryValue
      const totalCost = needed * costPerEntry

      // Intervenção: criar vagas "subsidiadas" que custam menos
      // O Jupiter Pool cobre 50% do custo de entrada
      const subsidyPercent = 0.5
      const subsidyCost = totalCost * subsidyPercent

      if (this.funds.jupiterPool >= subsidyCost) {
        // Simula que novos usuários entram atraídos pelo subsídio
        for (let i = 0; i < needed; i++) {
          // Cria um usuário atraído pelo subsídio
          const id = ++this.userIdCounter
          const newUser: User = {
            id,
            balance: entryValue, // Recebe entrada subsidiada
            totalEarned: 0,
            totalDeposited: entryValue * subsidyPercent, // Pagou só metade
            referrerId: null,
            joinedDay: this.currentDay,
            quotas: new Map(),
            activeReferralsCount: 0,
          }
          this.users.set(id, newUser)

          // Cria entrada na fila
          const entry: QuotaEntry = {
            id: ++this.quotaIdCounter,
            userId: id,
            level: stuck.index + 1,
            score: 0, // Score normal
            enteredDay: this.currentDay,
            reentries: 0,
            status: 'WAITING',
          }
          stuck.level.queue.push(entry)
          newUser.quotas.set(stuck.index + 1, [entry])
        }

        // Atualiza scores e ordena
        for (const entry of stuck.level.queue) {
          entry.score = this.calculateScore(entry, this.currentDay)
        }
        stuck.level.queue.sort((a, b) => b.score - a.score)

        this.funds.jupiterPool -= subsidyCost
        this.jupiterPoolUsed += subsidyCost
        this.interventionCount++
        interventionsToday++

        // Tenta processar ciclos
        while (this.processCycle(stuck.index)) {
          // Processa todos os ciclos possíveis
        }
      }
    }
  }

  private simulateDay(): void {
    // 1. Adiciona novos usuários
    const newUserCount = Math.min(
      this.scenario.getUsersPerDay(this.currentDay),
      CONFIG.MAX_USERS - this.users.size
    )

    for (let i = 0; i < newUserCount; i++) {
      // 70% são indicados por usuários existentes
      const existingUsers = Array.from(this.users.values())
      const referrerId = existingUsers.length > 0 && Math.random() < 0.7
        ? existingUsers[Math.floor(Math.random() * existingUsers.length)].id
        : null

      const user = this.createUser(referrerId)

      // Compra cota no nível 1
      this.purchaseQuota(user, 1)

      // 30% compram cota extra
      if (Math.random() < 0.3) {
        this.purchaseQuota(user, 1)
      }
    }

    // 2. Atualiza scores
    this.updateAllScores()

    // 3. Processa ciclos em cada nível
    const cyclesPerLevel = new Array(10).fill(0)
    for (let i = 0; i < 10; i++) {
      let cyclesProcessed = 0
      while (this.processCycle(i)) {
        cyclesProcessed++
        if (cyclesProcessed >= 10) break // Limite de ciclos por dia por nível
      }
      cyclesPerLevel[i] = cyclesProcessed
    }

    // 4. Atualiza dias sem ciclo
    for (const level of this.levels) {
      if (level.lastCycleDay < this.currentDay) {
        level.daysSinceLastCycle++
      }
    }

    // 5. Jupiter Pool intervention (se ativo)
    if (this.withJupiterPool) {
      this.executeJupiterIntervention()
    }

    // 6. Coleta métricas
    this.collectMetrics(newUserCount, cyclesPerLevel)
  }

  private collectMetrics(newUsers: number, cyclesPerLevel: number[]): void {
    const avgWaitTimePerLevel: number[] = []
    const queueSizePerLevel: number[] = []
    const stuckLevels: number[] = []

    for (let i = 0; i < 10; i++) {
      const level = this.levels[i]
      queueSizePerLevel.push(level.queue.length)

      if (level.queue.length > 0) {
        const avgWait = level.queue.reduce((sum, e) => sum + (this.currentDay - e.enteredDay), 0) / level.queue.length
        avgWaitTimePerLevel.push(avgWait)
      } else {
        avgWaitTimePerLevel.push(0)
      }

      if (level.daysSinceLastCycle >= CONFIG.INTERVENTION_TRIGGERS.YELLOW && level.queue.length > 0) {
        stuckLevels.push(i + 1)
      }
    }

    const totalEarnings = Array.from(this.users.values()).reduce((sum, u) => sum + u.totalEarned, 0)

    this.metrics.push({
      day: this.currentDay,
      newUsers,
      totalUsers: this.users.size,
      cyclesPerLevel,
      avgWaitTimePerLevel,
      queueSizePerLevel,
      jupiterPoolBalance: this.funds.jupiterPool,
      interventions: this.interventionCount,
      totalEarnings,
      stuckLevels,
    })
  }

  run(): SimulationResult {
    console.log(`\n🚀 Iniciando simulação: ${this.scenario.name} (${this.withJupiterPool ? 'COM' : 'SEM'} Jupiter Pool)`)

    for (this.currentDay = 1; this.currentDay <= CONFIG.SIMULATION_DAYS; this.currentDay++) {
      this.simulateDay()

      // Progress indicator
      if (this.currentDay % 10 === 0) {
        process.stdout.write(`  Dia ${this.currentDay}/${CONFIG.SIMULATION_DAYS}...\r`)
      }
    }

    // Calcula estatísticas finais
    const totalCycles = this.levels.reduce((sum, l) => sum + l.totalCycles, 0)
    const allWaitTimes = this.levels.flatMap(l => l.queue.map(e => this.currentDay - e.enteredDay))
    const avgWaitTime = allWaitTimes.length > 0
      ? allWaitTimes.reduce((a, b) => a + b, 0) / allWaitTimes.length
      : 0
    const maxWaitTime = allWaitTimes.length > 0 ? Math.max(...allWaitTimes) : 0
    const stuckLevels = this.levels.filter(l => l.daysSinceLastCycle >= CONFIG.INTERVENTION_TRIGGERS.YELLOW && l.queue.length > 0).length

    const totalEarnings = Array.from(this.users.values()).reduce((sum, u) => sum + u.totalEarned, 0)

    return {
      name: `${this.scenario.code} - ${this.scenario.name} (${this.withJupiterPool ? 'Com' : 'Sem'} Jupiter Pool)`,
      withJupiterPool: this.withJupiterPool,
      scenario: this.scenario.code,
      metrics: this.metrics,
      finalStats: {
        totalUsers: this.users.size,
        totalCycles,
        totalEarnings,
        avgWaitTime,
        maxWaitTime,
        stuckLevels,
        jupiterPoolUsed: this.jupiterPoolUsed,
        interventionCount: this.interventionCount,
      },
    }
  }
}

// ==========================================
// GERAÇÃO DE RELATÓRIO
// ==========================================

function generateReport(results: SimulationResult[]): void {
  console.log('\n')
  console.log('═'.repeat(100))
  console.log('                    7iATLAS - RELATÓRIO DE SIMULAÇÃO JUPITER POOL')
  console.log('═'.repeat(100))
  console.log(`\nData: ${new Date().toLocaleString('pt-BR')}`)
  console.log(`Dias simulados: ${CONFIG.SIMULATION_DAYS}`)
  console.log(`Máximo de usuários: ${CONFIG.MAX_USERS}`)
  console.log(`Jupiter Pool: ${CONFIG.JUPITER_POOL_PERCENT}% do ganho do recebedor`)
  console.log('\n')

  // Agrupa por cenário
  const scenarios = [...new Set(results.map(r => r.scenario))]

  // MOSTRAR DETALHES DE CADA CENÁRIO
  for (const scenarioCode of scenarios) {
    const scenarioResults = results.filter(r => r.scenario === scenarioCode)
    const withPool = scenarioResults.find(r => r.withJupiterPool)!
    const withoutPool = scenarioResults.find(r => !r.withJupiterPool)!
    const scenario = SCENARIOS.find(s => s.code === scenarioCode)!

    console.log('─'.repeat(100))
    console.log(`📊 CENÁRIO ${scenarioCode}: ${scenario.name.toUpperCase()}`)
    console.log(`   ${scenario.description}`)
    console.log('─'.repeat(100))
    console.log('')

    // Tabela comparativa
    console.log('┌────────────────────────────────┬─────────────────────┬─────────────────────┬────────────────┐')
    console.log('│ Métrica                        │    SEM Jupiter Pool │    COM Jupiter Pool │     Diferença  │')
    console.log('├────────────────────────────────┼─────────────────────┼─────────────────────┼────────────────┤')

    const metrics = [
      { name: 'Total de Usuários', key: 'totalUsers', format: (v: number) => v.toLocaleString('pt-BR') },
      { name: 'Total de Ciclos', key: 'totalCycles', format: (v: number) => v.toLocaleString('pt-BR') },
      { name: 'Ganhos Totais ($)', key: 'totalEarnings', format: (v: number) => `$${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      { name: 'Tempo Médio Espera (dias)', key: 'avgWaitTime', format: (v: number) => v.toFixed(1) },
      { name: 'Tempo Máximo Espera (dias)', key: 'maxWaitTime', format: (v: number) => v.toFixed(0) },
      { name: 'Níveis Travados (final)', key: 'stuckLevels', format: (v: number) => v.toString() },
      { name: 'Intervenções Jupiter', key: 'interventionCount', format: (v: number) => v.toLocaleString('pt-BR') },
      { name: 'Jupiter Pool Usado ($)', key: 'jupiterPoolUsed', format: (v: number) => `$${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    ]

    for (const metric of metrics) {
      const withoutValue = withoutPool.finalStats[metric.key as keyof typeof withoutPool.finalStats] as number
      const withValue = withPool.finalStats[metric.key as keyof typeof withPool.finalStats] as number

      let diff = ''
      if (typeof withoutValue === 'number' && typeof withValue === 'number') {
        const change = withValue - withoutValue
        const pct = withoutValue !== 0 ? ((change / withoutValue) * 100).toFixed(1) : 'N/A'
        if (change > 0) {
          diff = `+${pct}%`
        } else if (change < 0) {
          diff = `${pct}%`
        } else {
          diff = '0%'
        }
      }

      console.log(`│ ${metric.name.padEnd(30)} │ ${metric.format(withoutValue).padStart(19)} │ ${metric.format(withValue).padStart(19)} │ ${diff.padStart(14)} │`)
    }

    console.log('└────────────────────────────────┴─────────────────────┴─────────────────────┴────────────────┘')

    // Análise de níveis travados ao longo do tempo
    console.log('\n📈 Evolução de Níveis Travados (dias com travamento):')
    console.log('')

    const checkpoints = [15, 30, 45, 60, 75, 90].filter(d => d <= CONFIG.SIMULATION_DAYS)
    console.log('┌──────────┬' + checkpoints.map(() => '─────────────┬').join(''))
    console.log('│          │' + checkpoints.map(d => ` Dia ${d.toString().padEnd(6)} │`).join(''))
    console.log('├──────────┼' + checkpoints.map(() => '─────────────┼').join(''))

    console.log('│ SEM Pool │' + checkpoints.map(d => {
      const metric = withoutPool.metrics.find(m => m.day === d)
      return ` ${(metric?.stuckLevels.length || 0).toString().padStart(5)} niv. │`
    }).join(''))

    console.log('│ COM Pool │' + checkpoints.map(d => {
      const metric = withPool.metrics.find(m => m.day === d)
      return ` ${(metric?.stuckLevels.length || 0).toString().padStart(5)} niv. │`
    }).join(''))

    console.log('└──────────┴' + checkpoints.map(() => '─────────────┴').join(''))

    // Gráfico ASCII simples de ciclos por dia
    console.log('\n📊 Ciclos por Dia (Nível 1):')
    console.log('')

    const maxCycles = Math.max(
      ...withPool.metrics.map(m => m.cyclesPerLevel[0]),
      ...withoutPool.metrics.map(m => m.cyclesPerLevel[0])
    )
    const scale = maxCycles > 0 ? 50 / maxCycles : 1

    for (let week = 0; week < Math.ceil(CONFIG.SIMULATION_DAYS / 7); week++) {
      const startDay = week * 7 + 1
      const endDay = Math.min(startDay + 6, CONFIG.SIMULATION_DAYS)

      const withoutAvg = withoutPool.metrics
        .filter(m => m.day >= startDay && m.day <= endDay)
        .reduce((sum, m) => sum + m.cyclesPerLevel[0], 0) / 7

      const withAvg = withPool.metrics
        .filter(m => m.day >= startDay && m.day <= endDay)
        .reduce((sum, m) => sum + m.cyclesPerLevel[0], 0) / 7

      const withoutBar = '█'.repeat(Math.round(withoutAvg * scale))
      const withBar = '▓'.repeat(Math.round(withAvg * scale))

      console.log(`  Sem ${('S' + (week + 1)).padEnd(3)} │${withoutBar}`)
      console.log(`  Com ${('S' + (week + 1)).padEnd(3)} │${withBar}`)
      console.log('')
    }
    console.log('  Legenda: █ = Sem Jupiter Pool | ▓ = Com Jupiter Pool')

    // Conclusão do cenário
    console.log('\n💡 CONCLUSÃO DO CENÁRIO:')

    const cycleImprovement = withoutPool.finalStats.totalCycles > 0
      ? ((withPool.finalStats.totalCycles - withoutPool.finalStats.totalCycles) / withoutPool.finalStats.totalCycles * 100).toFixed(1)
      : 'N/A'

    const waitImprovement = withoutPool.finalStats.avgWaitTime > 0
      ? ((withoutPool.finalStats.avgWaitTime - withPool.finalStats.avgWaitTime) / withoutPool.finalStats.avgWaitTime * 100).toFixed(1)
      : 'N/A'

    console.log(`   • Melhoria em ciclos: ${cycleImprovement}%`)
    console.log(`   • Redução no tempo de espera: ${waitImprovement}%`)
    console.log(`   • Intervenções do Jupiter Pool: ${withPool.finalStats.interventionCount}`)
    console.log(`   • Valor total usado para destravar: $${withPool.finalStats.jupiterPoolUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

    if (withPool.finalStats.stuckLevels < withoutPool.finalStats.stuckLevels) {
      console.log(`   ✅ Jupiter Pool REDUZIU níveis travados de ${withoutPool.finalStats.stuckLevels} para ${withPool.finalStats.stuckLevels}`)
    } else if (withPool.finalStats.stuckLevels === withoutPool.finalStats.stuckLevels) {
      console.log(`   ⚪ Jupiter Pool MANTEVE níveis travados em ${withPool.finalStats.stuckLevels}`)
    } else {
      console.log(`   ⚠️ Jupiter Pool AUMENTOU níveis travados (investigar)`)
    }

    console.log('\n')
  }

  // Resumo geral
  console.log('═'.repeat(100))
  console.log('                              RESUMO GERAL DA SIMULAÇÃO')
  console.log('═'.repeat(100))
  console.log('')

  const withPoolResults = results.filter(r => r.withJupiterPool)
  const withoutPoolResults = results.filter(r => !r.withJupiterPool)

  const avgCyclesWith = withPoolResults.reduce((sum, r) => sum + r.finalStats.totalCycles, 0) / withPoolResults.length
  const avgCyclesWithout = withoutPoolResults.reduce((sum, r) => sum + r.finalStats.totalCycles, 0) / withoutPoolResults.length
  const avgWaitWith = withPoolResults.reduce((sum, r) => sum + r.finalStats.avgWaitTime, 0) / withPoolResults.length
  const avgWaitWithout = withoutPoolResults.reduce((sum, r) => sum + r.finalStats.avgWaitTime, 0) / withoutPoolResults.length
  const avgStuckWith = withPoolResults.reduce((sum, r) => sum + r.finalStats.stuckLevels, 0) / withPoolResults.length
  const avgStuckWithout = withoutPoolResults.reduce((sum, r) => sum + r.finalStats.stuckLevels, 0) / withoutPoolResults.length

  console.log('┌────────────────────────────────┬─────────────────────┬─────────────────────┬────────────────┐')
  console.log('│ Média de Todos os Cenários     │    SEM Jupiter Pool │    COM Jupiter Pool │     Diferença  │')
  console.log('├────────────────────────────────┼─────────────────────┼─────────────────────┼────────────────┤')

  const cyclesDiff = avgCyclesWithout > 0 ? ((avgCyclesWith - avgCyclesWithout) / avgCyclesWithout * 100) : 0
  const waitDiff = avgWaitWithout > 0 ? ((avgWaitWithout - avgWaitWith) / avgWaitWithout * 100) : 0
  const stuckDiff = avgStuckWithout > 0 ? ((avgStuckWithout - avgStuckWith) / avgStuckWithout * 100) : 0

  const formatDiff = (val: number) => val >= 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`

  console.log(`│ Média de Ciclos                │ ${avgCyclesWithout.toFixed(0).padStart(19)} │ ${avgCyclesWith.toFixed(0).padStart(19)} │ ${formatDiff(cyclesDiff).padStart(14)} │`)
  console.log(`│ Tempo Médio de Espera (dias)   │ ${avgWaitWithout.toFixed(1).padStart(19)} │ ${avgWaitWith.toFixed(1).padStart(19)} │ ${formatDiff(waitDiff).padStart(14)} │`)
  console.log(`│ Média de Níveis Travados       │ ${avgStuckWithout.toFixed(1).padStart(19)} │ ${avgStuckWith.toFixed(1).padStart(19)} │ ${formatDiff(stuckDiff).padStart(14)} │`)
  console.log('└────────────────────────────────┴─────────────────────┴─────────────────────┴────────────────┘')

  // Métricas detalhadas de intervenção
  const totalInterventions = withPoolResults.reduce((sum, r) => sum + r.finalStats.interventionCount, 0)
  const totalPoolUsed = withPoolResults.reduce((sum, r) => sum + r.finalStats.jupiterPoolUsed, 0)

  console.log('\n📊 ESTATÍSTICAS DO JUPITER POOL:')
  console.log(`   • Total de intervenções: ${totalInterventions}`)
  console.log(`   • Valor total usado: $${totalPoolUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

  console.log('\n')
  console.log('═'.repeat(100))
  console.log('                                    VEREDICTO FINAL')
  console.log('═'.repeat(100))
  console.log('')

  // Considera positivo se: mais ciclos OU menos tempo de espera OU menos travamento
  const overallImprovement = cyclesDiff + waitDiff + stuckDiff

  if (overallImprovement > 15) {
    console.log('  ✅ JUPITER POOL RECOMENDADO')
    console.log('')
    console.log('  O Jupiter Pool demonstrou melhorias significativas em todos os cenários testados.')
    console.log('  A implementação traria benefícios claros para a estabilidade do sistema.')
  } else if (overallImprovement > 5) {
    console.log('  🟡 JUPITER POOL MODERADAMENTE RECOMENDADO')
    console.log('')
    console.log('  O Jupiter Pool mostrou algumas melhorias, mas os ganhos são moderados.')
    console.log('  Considere implementar com cautela e monitoramento.')
  } else {
    console.log('  ⚪ JUPITER POOL NEUTRO')
    console.log('')
    console.log('  O Jupiter Pool não demonstrou melhorias significativas nesta simulação.')
    console.log('  Recomenda-se reavaliação dos parâmetros ou cenários.')
  }

  console.log('')
  console.log('═'.repeat(100))
  console.log('')
}

// ==========================================
// EXECUÇÃO PRINCIPAL
// ==========================================

async function main(): Promise<void> {
  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════╗')
  console.log('║                     7iATLAS - SIMULAÇÃO JUPITER POOL                                         ║')
  console.log('║                     Teste Matemático com até 10.000 Usuários                                 ║')
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`📋 Cenários a testar: ${SCENARIOS.length}`)
  console.log(`👥 Máximo de usuários: ${CONFIG.MAX_USERS.toLocaleString('pt-BR')}`)
  console.log(`📅 Dias de simulação: ${CONFIG.SIMULATION_DAYS}`)
  console.log(`💰 Jupiter Pool: ${CONFIG.JUPITER_POOL_PERCENT}% do ganho`)
  console.log('')

  const results: SimulationResult[] = []

  for (const scenario of SCENARIOS) {
    console.log(`\n${'─'.repeat(50)}`)
    console.log(`📌 Testando cenário ${scenario.code}: ${scenario.name}`)
    console.log(`   ${scenario.description}`)

    // Simula SEM Jupiter Pool
    const simWithout = new MatrixSimulation(false, scenario)
    const resultWithout = simWithout.run()
    results.push(resultWithout)

    // Simula COM Jupiter Pool
    const simWith = new MatrixSimulation(true, scenario)
    const resultWith = simWith.run()
    results.push(resultWith)

    console.log(`   ✓ Cenário ${scenario.code} concluído`)
  }

  // Gera relatório
  generateReport(results)

  // Análise detalhada por cenário
  generateDetailedAnalysis(results)

  console.log('🏁 Simulação concluída!')
  console.log('')
}

// ==========================================
// ANÁLISE DETALHADA
// ==========================================

function generateDetailedAnalysis(results: SimulationResult[]): void {
  console.log('\n')
  console.log('═'.repeat(100))
  console.log('                           ANÁLISE DETALHADA POR CENÁRIO')
  console.log('═'.repeat(100))

  const scenarios = [...new Set(results.map(r => r.scenario))]

  for (const scenarioCode of scenarios) {
    const scenarioResults = results.filter(r => r.scenario === scenarioCode)
    const withPool = scenarioResults.find(r => r.withJupiterPool)!
    const withoutPool = scenarioResults.find(r => !r.withJupiterPool)!
    const scenario = SCENARIOS.find(s => s.code === scenarioCode)!

    console.log('\n' + '─'.repeat(100))
    console.log(`CENÁRIO ${scenarioCode}: ${scenario.name.toUpperCase()}`)
    console.log('─'.repeat(100))

    // Tabela comparativa detalhada
    console.log('\n┌────────────────────────────────┬─────────────────────┬─────────────────────┬────────────────┐')
    console.log('│ Métrica                        │    SEM Jupiter Pool │    COM Jupiter Pool │     Variação   │')
    console.log('├────────────────────────────────┼─────────────────────┼─────────────────────┼────────────────┤')

    const metricsList = [
      { name: 'Total de Usuários', w: withoutPool.finalStats.totalUsers, c: withPool.finalStats.totalUsers },
      { name: 'Total de Ciclos', w: withoutPool.finalStats.totalCycles, c: withPool.finalStats.totalCycles },
      { name: 'Ganhos Totais ($)', w: withoutPool.finalStats.totalEarnings, c: withPool.finalStats.totalEarnings, money: true },
      { name: 'Tempo Médio Espera (dias)', w: withoutPool.finalStats.avgWaitTime, c: withPool.finalStats.avgWaitTime, decimal: true },
      { name: 'Tempo Máximo Espera (dias)', w: withoutPool.finalStats.maxWaitTime, c: withPool.finalStats.maxWaitTime },
      { name: 'Níveis Travados (final)', w: withoutPool.finalStats.stuckLevels, c: withPool.finalStats.stuckLevels },
      { name: 'Intervenções Jupiter', w: 0, c: withPool.finalStats.interventionCount },
      { name: 'Jupiter Pool Usado ($)', w: 0, c: withPool.finalStats.jupiterPoolUsed, money: true },
    ]

    for (const m of metricsList) {
      let wStr = m.money ? `$${m.w.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
                 m.decimal ? m.w.toFixed(1) : m.w.toLocaleString('pt-BR')
      let cStr = m.money ? `$${m.c.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
                 m.decimal ? m.c.toFixed(1) : m.c.toLocaleString('pt-BR')

      let varStr = ''
      if (m.w !== 0) {
        const pct = ((m.c - m.w) / m.w * 100)
        varStr = pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`
      } else if (m.c !== 0) {
        varStr = 'N/A'
      } else {
        varStr = '='
      }

      console.log(`│ ${m.name.padEnd(30)} │ ${wStr.padStart(19)} │ ${cStr.padStart(19)} │ ${varStr.padStart(14)} │`)
    }

    console.log('└────────────────────────────────┴─────────────────────┴─────────────────────┴────────────────┘')

    // Análise específica
    const cycleImprovement = withoutPool.finalStats.totalCycles > 0
      ? ((withPool.finalStats.totalCycles - withoutPool.finalStats.totalCycles) / withoutPool.finalStats.totalCycles * 100)
      : 0

    console.log('\n📊 ANÁLISE:')

    if (cycleImprovement > 5) {
      console.log(`   ✅ Jupiter Pool AUMENTOU ciclos em ${cycleImprovement.toFixed(1)}%`)
    } else if (cycleImprovement < -5) {
      console.log(`   ⚠️ Jupiter Pool REDUZIU ciclos em ${Math.abs(cycleImprovement).toFixed(1)}%`)
    } else {
      console.log(`   ⚪ Impacto neutro em ciclos (${cycleImprovement >= 0 ? '+' : ''}${cycleImprovement.toFixed(1)}%)`)
    }

    if (withPool.finalStats.interventionCount > 0) {
      const avgCostPerIntervention = withPool.finalStats.jupiterPoolUsed / withPool.finalStats.interventionCount
      console.log(`   💰 Custo médio por intervenção: $${avgCostPerIntervention.toFixed(2)}`)

      const cyclesGained = withPool.finalStats.totalCycles - withoutPool.finalStats.totalCycles
      if (cyclesGained > 0) {
        const costPerCycleGained = withPool.finalStats.jupiterPoolUsed / cyclesGained
        console.log(`   📈 Custo por ciclo adicional: $${costPerCycleGained.toFixed(2)}`)
      }
    }

    // Efetividade em cenários específicos
    if (scenario.code === 'C' || scenario.code === 'D') {
      console.log(`\n   🎯 Este cenário (${scenario.name}) é onde Jupiter Pool deve ter MAIOR impacto`)
      if (cycleImprovement > 0) {
        console.log(`   ✅ Jupiter Pool CUMPRIU seu propósito neste cenário de ${scenario.name.toLowerCase()}`)
      } else {
        console.log(`   ⚠️ Jupiter Pool NÃO foi efetivo neste cenário - requer ajustes nos parâmetros`)
      }
    }
  }

  // Conclusão final
  console.log('\n')
  console.log('═'.repeat(100))
  console.log('                              CONCLUSÕES E RECOMENDAÇÕES')
  console.log('═'.repeat(100))

  const withPoolResults = results.filter(r => r.withJupiterPool)
  const withoutPoolResults = results.filter(r => !r.withJupiterPool)

  // Cenários onde Jupiter Pool foi mais efetivo
  const improvements: { scenario: string, improvement: number }[] = []

  for (const scenario of SCENARIOS) {
    const without = withoutPoolResults.find(r => r.scenario === scenario.code)!
    const with_ = withPoolResults.find(r => r.scenario === scenario.code)!

    if (without.finalStats.totalCycles > 0) {
      const imp = ((with_.finalStats.totalCycles - without.finalStats.totalCycles) / without.finalStats.totalCycles * 100)
      improvements.push({ scenario: scenario.name, improvement: imp })
    }
  }

  improvements.sort((a, b) => b.improvement - a.improvement)

  console.log('\n📊 RANKING DE EFETIVIDADE POR CENÁRIO:')
  console.log('')

  for (let i = 0; i < improvements.length; i++) {
    const imp = improvements[i]
    const emoji = imp.improvement > 5 ? '✅' : imp.improvement < -5 ? '❌' : '⚪'
    const sign = imp.improvement >= 0 ? '+' : ''
    console.log(`   ${i + 1}. ${imp.scenario.padEnd(15)} ${emoji} ${sign}${imp.improvement.toFixed(1)}% ciclos`)
  }

  console.log('\n📋 RECOMENDAÇÕES:')
  console.log('')

  const avgImprovement = improvements.reduce((sum, i) => sum + i.improvement, 0) / improvements.length
  const positiveScenarios = improvements.filter(i => i.improvement > 0).length
  const negativeScenarios = improvements.filter(i => i.improvement < 0).length

  if (positiveScenarios > negativeScenarios && avgImprovement > 0) {
    console.log('   ✅ Jupiter Pool é RECOMENDADO para implementação')
    console.log(`      - Melhoria média: +${avgImprovement.toFixed(1)}% ciclos`)
    console.log(`      - Cenários positivos: ${positiveScenarios}/${SCENARIOS.length}`)
    console.log('')
    console.log('   📌 Sugestões de ajuste:')
    console.log('      - Taxa de contribuição atual (10%) pode ser mantida')
    console.log('      - Considerar aumentar frequência de intervenções em cenários de crise')
  } else if (negativeScenarios > positiveScenarios) {
    console.log('   ⚠️ Jupiter Pool NÃO é recomendado com configuração atual')
    console.log(`      - Impacto médio: ${avgImprovement.toFixed(1)}% ciclos`)
    console.log(`      - Cenários negativos: ${negativeScenarios}/${SCENARIOS.length}`)
    console.log('')
    console.log('   📌 Ajustes necessários:')
    console.log('      - Reduzir taxa de contribuição (tentar 5% ao invés de 10%)')
    console.log('      - Melhorar algoritmo de intervenção para ser mais agressivo')
    console.log('      - Focar intervenções apenas em cenários de crise detectados')
  } else {
    console.log('   ⚪ Jupiter Pool tem IMPACTO NEUTRO')
    console.log(`      - Impacto médio: ${avgImprovement >= 0 ? '+' : ''}${avgImprovement.toFixed(1)}% ciclos`)
    console.log('')
    console.log('   📌 Opções:')
    console.log('      - Implementar com monitoramento próximo')
    console.log('      - Testar com taxa menor (5%) para reduzir overhead')
    console.log('      - Considerar ativar apenas em emergências detectadas')
  }

  console.log('')
}

// Executa
main().catch(console.error)
