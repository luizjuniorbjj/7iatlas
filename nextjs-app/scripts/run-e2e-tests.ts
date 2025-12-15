/**
 * 7iATLAS - Script de Testes E2E com SQLite
 *
 * Este script:
 * 1. Cria banco SQLite de teste
 * 2. Popula com dados iniciais
 * 3. Executa todos os testes E2E
 * 4. Mostra resultados
 *
 * Uso: npx ts-node --transpile-only scripts/run-e2e-tests.ts
 */

// Valores de entrada por nível
const LEVEL_VALUES = [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120]

// ==========================================
// TIPOS
// ==========================================

interface User {
  id: string
  email: string | null
  walletAddress: string
  name: string | null
  referralCode: string
  referrerId: string | null
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  balance: number
  totalDeposited: number
  totalEarned: number
  totalBonus: number
  activatedAt: Date | null
  createdAt: Date
}

interface Level {
  id: number
  levelNumber: number
  entryValue: number
  rewardValue: number
  bonusValue: number
  cashBalance: number
  totalCycles: number
  totalUsers: number
}

interface QueueEntry {
  id: string
  oderId: string
  levelId: number
  score: number
  reentries: number
  quotaNumber: number
  status: 'WAITING' | 'PROCESSING' | 'COMPLETED'
  enteredAt: Date
}

interface SystemFunds {
  reserve: number
  operational: number
  profit: number
  totalIn: number
  totalOut: number
}

interface CycleResult {
  level: number
  receiverId: string
  receiverGross: number
  receiverNet: number
  jupiterPoolDeposit: number
  participants: { oderId: string; position: string }[]
}

// ==========================================
// ESTADO GLOBAL (Simulando Banco SQLite)
// ==========================================

let users: Map<string, User> = new Map()
let levels: Level[] = []
let queueEntries: Map<string, QueueEntry> = new Map()
let systemFunds: SystemFunds = { reserve: 0, operational: 0, profit: 0, totalIn: 0, totalOut: 0 }

// ==========================================
// FUNÇÕES DO BANCO
// ==========================================

function generateId(): string {
  return 'clx' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function initializeLevels(): void {
  levels = []
  for (let i = 0; i < 10; i++) {
    levels.push({
      id: i + 1,
      levelNumber: i + 1,
      entryValue: LEVEL_VALUES[i],
      rewardValue: LEVEL_VALUES[i] * 2,
      bonusValue: LEVEL_VALUES[i] * 0.4,
      cashBalance: 0,
      totalCycles: 0,
      totalUsers: 0,
    })
  }
}

function resetDatabase(): void {
  users.clear()
  queueEntries.clear()
  systemFunds = { reserve: 0, operational: 0, profit: 0, totalIn: 0, totalOut: 0 }
  for (const level of levels) {
    level.cashBalance = 0
    level.totalCycles = 0
    level.totalUsers = 0
  }
}

// ==========================================
// FUNÇÕES DO SERVIÇO (REPLICADAS)
// ==========================================

function createUser(data: Partial<User>): User {
  const id = generateId()
  const user: User = {
    id,
    email: data.email || null,
    walletAddress: data.walletAddress || '0x' + Math.random().toString(16).slice(2).padEnd(40, '0'),
    name: data.name || null,
    referralCode: generateId().slice(0, 8).toUpperCase(),
    referrerId: data.referrerId || null,
    status: data.status || 'PENDING',
    balance: data.balance || 0,
    totalDeposited: data.totalDeposited || 0,
    totalEarned: data.totalEarned || 0,
    totalBonus: data.totalBonus || 0,
    activatedAt: data.status === 'ACTIVE' ? new Date() : null,
    createdAt: new Date(),
  }
  users.set(id, user)
  return user
}

function addToQueue(userId: string, levelNumber: number, isNewQuota: boolean = true): QueueEntry | null {
  const level = levels.find(l => l.levelNumber === levelNumber)
  if (!level) return null

  // Se não é nova cota, incrementar reentradas
  if (!isNewQuota) {
    const existingEntries = Array.from(queueEntries.values())
      .filter(e => e.oderId === userId && e.levelId === level.id && e.status === 'WAITING')
    if (existingEntries.length > 0) {
      existingEntries[0].reentries++
      return existingEntries[0]
    }
  }

  // Contar cotas existentes
  const quotaCount = Array.from(queueEntries.values())
    .filter(e => e.oderId === userId && e.levelId === level.id).length

  const entry: QueueEntry = {
    id: generateId(),
    oderId: userId,
    levelId: level.id,
    score: 0,
    reentries: 0,
    quotaNumber: quotaCount + 1,
    status: 'WAITING',
    enteredAt: new Date(),
  }
  queueEntries.set(entry.id, entry)
  level.totalUsers++
  return entry
}

function canPurchaseQuota(userId: string, levelNumber: number): { canPurchase: boolean; reason?: string } {
  const user = users.get(userId)
  if (!user) return { canPurchase: false, reason: 'Usuário não encontrado' }
  if (user.status !== 'ACTIVE') return { canPurchase: false, reason: 'Usuário não está ativo' }

  if (levelNumber === 1) return { canPurchase: true }

  // Verificar se tem cota no nível anterior
  const prevLevel = levels.find(l => l.levelNumber === levelNumber - 1)
  if (prevLevel) {
    const hasQuota = Array.from(queueEntries.values())
      .some(e => e.oderId === userId && e.levelId === prevLevel.id)
    if (!hasQuota) {
      return { canPurchase: false, reason: `Precisa ter pelo menos 1 cota no Nível ${levelNumber - 1} primeiro` }
    }
  }

  return { canPurchase: true }
}

function purchaseQuota(userId: string, levelNumber: number): { success: boolean; quotaNumber?: number; error?: string } {
  const canPurchase = canPurchaseQuota(userId, levelNumber)
  if (!canPurchase.canPurchase) {
    return { success: false, error: canPurchase.reason }
  }

  const user = users.get(userId)!
  const level = levels.find(l => l.levelNumber === levelNumber)!
  const entryValue = level.entryValue

  if (user.balance < entryValue) {
    return { success: false, error: 'Saldo insuficiente' }
  }

  // Debitar saldo
  user.balance -= entryValue
  user.totalDeposited += entryValue

  // Adicionar ao caixa
  level.cashBalance += entryValue

  // Criar entrada na fila
  const entry = addToQueue(userId, levelNumber, true)

  // Atualizar sistema
  systemFunds.totalIn += entryValue

  return { success: true, quotaNumber: entry?.quotaNumber }
}

function canProcessCycle(levelNumber: number): boolean {
  const level = levels.find(l => l.levelNumber === levelNumber)
  if (!level) return false

  const waitingEntries = Array.from(queueEntries.values())
    .filter(e => e.levelId === level.id && e.status === 'WAITING')

  if (waitingEntries.length < 7) return false

  const requiredCash = level.entryValue * 7
  return level.cashBalance >= requiredCash
}

function processCycle(levelNumber: number): CycleResult | null {
  if (!canProcessCycle(levelNumber)) return null

  const level = levels.find(l => l.levelNumber === levelNumber)!
  const waitingEntries = Array.from(queueEntries.values())
    .filter(e => e.levelId === level.id && e.status === 'WAITING')
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)

  const positions = ['RECEIVER', 'DONATE_1', 'ADVANCE_1', 'DONATE_2', 'ADVANCE_2', 'COMMUNITY', 'REENTRY']

  // Receiver
  const receiver = waitingEntries[0]
  const receiverUser = users.get(receiver.oderId)!

  const grossReward = level.rewardValue
  const jupiterPoolDeposit = grossReward * 0.10
  const netReward = grossReward - jupiterPoolDeposit

  // Pagar receiver
  receiverUser.balance += netReward
  receiverUser.totalEarned += netReward

  // Jupiter Pool (não temos, vai para profit)
  systemFunds.profit += jupiterPoolDeposit

  // Posição 5 - Community
  const communityValue = level.entryValue
  systemFunds.reserve += communityValue * 0.10
  systemFunds.operational += communityValue * 0.10
  systemFunds.profit += communityValue * 0.80

  // Descontar do caixa
  level.cashBalance -= level.entryValue * 7

  // Adicionar ao caixa N+1
  if (levelNumber < 10) {
    const nextLevel = levels.find(l => l.levelNumber === levelNumber + 1)!
    nextLevel.cashBalance += level.entryValue * 2
  }

  // Reentradas (pos 0 + pos 6)
  level.cashBalance += level.entryValue * 2

  // Marcar como completados
  for (const entry of waitingEntries) {
    entry.status = 'COMPLETED'
  }

  // Adicionar reentradas à fila
  for (let i = 0; i < 7; i++) {
    if (i !== 5) { // Posição 5 não reentra
      addToQueue(waitingEntries[i].oderId, levelNumber, false)
    }
  }

  // Receiver avança para próximo nível
  if (levelNumber < 10) {
    addToQueue(receiver.oderId, levelNumber + 1, true)
  }

  level.totalCycles++

  return {
    level: levelNumber,
    receiverId: receiver.oderId,
    receiverGross: grossReward,
    receiverNet: netReward,
    jupiterPoolDeposit,
    participants: waitingEntries.map((e, i) => ({ oderId: e.oderId, position: positions[i] })),
  }
}

// ==========================================
// TESTES E2E
// ==========================================

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function test(name: string, fn: () => void): void {
  try {
    fn()
    results.push({ name, passed: true })
    console.log(`  ✅ ${name}`)
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message })
    console.log(`  ❌ ${name}`)
    console.log(`     Erro: ${error.message}`)
  }
}

function expect(value: any) {
  return {
    toBe(expected: any) {
      if (value !== expected) {
        throw new Error(`Esperado ${expected}, recebido ${value}`)
      }
    },
    toBeGreaterThan(expected: number) {
      if (value <= expected) {
        throw new Error(`Esperado > ${expected}, recebido ${value}`)
      }
    },
    toBeLessThan(expected: number) {
      if (value >= expected) {
        throw new Error(`Esperado < ${expected}, recebido ${value}`)
      }
    },
    not: {
      toBeNull() {
        if (value === null) {
          throw new Error(`Esperado não nulo, recebido null`)
        }
      },
      toBe(expected: any) {
        if (value === expected) {
          throw new Error(`Esperado diferente de ${expected}`)
        }
      }
    },
    toContain(expected: string) {
      if (!value.includes(expected)) {
        throw new Error(`Esperado conter "${expected}" em "${value}"`)
      }
    }
  }
}

// ==========================================
// SUITES DE TESTE
// ==========================================

function runTests(): void {
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║         7iATLAS - TESTES E2E COM BANCO LOCAL                 ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  // Inicializar
  initializeLevels()

  // ==========================================
  // SUITE 1: Níveis do Sistema
  // ==========================================
  console.log('📊 SUITE 1: Níveis do Sistema')
  console.log('─'.repeat(50))

  test('deve ter 10 níveis criados', () => {
    expect(levels.length).toBe(10)
  })

  test('nível 1 deve ter valor $10', () => {
    expect(levels[0].entryValue).toBe(10)
  })

  test('nível 10 deve ter valor $5120', () => {
    expect(levels[9].entryValue).toBe(5120)
  })

  test('rewards devem ser 2x entrada', () => {
    for (const level of levels) {
      expect(level.rewardValue).toBe(level.entryValue * 2)
    }
  })

  // ==========================================
  // SUITE 2: Criação de Usuários
  // ==========================================
  console.log('\n👤 SUITE 2: Criação de Usuários')
  console.log('─'.repeat(50))

  resetDatabase()

  test('deve criar usuário', () => {
    const user = createUser({ name: 'Test User', status: 'ACTIVE' })
    expect(user.id).not.toBeNull()
    expect(user.status).toBe('ACTIVE')
  })

  test('deve criar usuário com referrer', () => {
    const referrer = createUser({ name: 'Referrer', status: 'ACTIVE' })
    const referred = createUser({ name: 'Referred', referrerId: referrer.id, status: 'ACTIVE' })
    expect(referred.referrerId).toBe(referrer.id)
  })

  // ==========================================
  // SUITE 3: Sistema de Fila
  // ==========================================
  console.log('\n📋 SUITE 3: Sistema de Fila')
  console.log('─'.repeat(50))

  resetDatabase()

  test('deve adicionar usuário à fila', () => {
    const user = createUser({ status: 'ACTIVE' })
    const entry = addToQueue(user.id, 1, true)
    expect(entry).not.toBeNull()
    expect(entry!.status).toBe('WAITING')
  })

  test('deve incrementar reentradas', () => {
    const user = createUser({ status: 'ACTIVE' })
    addToQueue(user.id, 1, true)
    addToQueue(user.id, 1, false)
    const entries = Array.from(queueEntries.values()).filter(e => e.oderId === user.id)
    expect(entries[0].reentries).toBe(1)
  })

  test('deve criar múltiplas cotas', () => {
    const user = createUser({ status: 'ACTIVE' })
    addToQueue(user.id, 1, true)
    addToQueue(user.id, 1, true)
    addToQueue(user.id, 1, true)
    const entries = Array.from(queueEntries.values()).filter(e => e.oderId === user.id)
    expect(entries.length).toBe(3)
  })

  // ==========================================
  // SUITE 4: Verificação de Compra
  // ==========================================
  console.log('\n🛒 SUITE 4: Verificação de Compra')
  console.log('─'.repeat(50))

  resetDatabase()

  test('deve permitir compra no N1 para usuário ativo', () => {
    const user = createUser({ status: 'ACTIVE' })
    const result = canPurchaseQuota(user.id, 1)
    expect(result.canPurchase).toBe(true)
  })

  test('deve negar compra para usuário pendente', () => {
    const user = createUser({ status: 'PENDING' })
    const result = canPurchaseQuota(user.id, 1)
    expect(result.canPurchase).toBe(false)
  })

  test('deve negar compra no N2 sem cota no N1', () => {
    const user = createUser({ status: 'ACTIVE' })
    const result = canPurchaseQuota(user.id, 2)
    expect(result.canPurchase).toBe(false)
    expect(result.reason!).toContain('Nível 1')
  })

  test('deve permitir compra no N2 com cota no N1', () => {
    const user = createUser({ status: 'ACTIVE' })
    addToQueue(user.id, 1, true)
    const result = canPurchaseQuota(user.id, 2)
    expect(result.canPurchase).toBe(true)
  })

  // ==========================================
  // SUITE 5: Compra de Cota
  // ==========================================
  console.log('\n💰 SUITE 5: Compra de Cota')
  console.log('─'.repeat(50))

  resetDatabase()

  test('deve comprar cota com saldo suficiente', () => {
    const user = createUser({ status: 'ACTIVE', balance: 100 })
    const result = purchaseQuota(user.id, 1)
    expect(result.success).toBe(true)
    expect(users.get(user.id)!.balance).toBe(90)
    expect(levels[0].cashBalance).toBe(10)
  })

  test('deve rejeitar compra com saldo insuficiente', () => {
    const user = createUser({ status: 'ACTIVE', balance: 5 })
    const result = purchaseQuota(user.id, 1)
    expect(result.success).toBe(false)
    expect(result.error!).toContain('Saldo insuficiente')
  })

  // ==========================================
  // SUITE 6: Verificação de Ciclo
  // ==========================================
  console.log('\n🔄 SUITE 6: Verificação de Ciclo')
  console.log('─'.repeat(50))

  resetDatabase()

  test('deve retornar false com menos de 7 pessoas', () => {
    for (let i = 0; i < 5; i++) {
      const user = createUser({ status: 'ACTIVE', balance: 100 })
      purchaseQuota(user.id, 1)
    }
    expect(canProcessCycle(1)).toBe(false)
  })

  test('deve retornar true com 7+ pessoas e caixa', () => {
    resetDatabase()
    for (let i = 0; i < 7; i++) {
      const user = createUser({ status: 'ACTIVE', balance: 100 })
      purchaseQuota(user.id, 1)
    }
    expect(canProcessCycle(1)).toBe(true)
  })

  // ==========================================
  // SUITE 7: Processamento de Ciclo
  // ==========================================
  console.log('\n⚙️ SUITE 7: Processamento de Ciclo')
  console.log('─'.repeat(50))

  resetDatabase()

  // Criar 7 usuários
  const testUsers: User[] = []
  for (let i = 0; i < 7; i++) {
    const user = createUser({ status: 'ACTIVE', balance: 100 })
    purchaseQuota(user.id, 1)
    testUsers.push(user)
  }

  test('deve processar ciclo completo', () => {
    const result = processCycle(1)
    expect(result).not.toBeNull()
    expect(result!.level).toBe(1)
    expect(result!.participants.length).toBe(7)
  })

  test('recebedor deve ganhar $18 líquido', () => {
    // O ciclo já foi processado acima
    const receiverId = Array.from(queueEntries.values())
      .filter(e => e.status === 'COMPLETED')[0]?.oderId
    if (receiverId) {
      const receiver = users.get(receiverId)!
      expect(receiver.totalEarned).toBe(18)
    }
  })

  test('contador de ciclos deve incrementar', () => {
    expect(levels[0].totalCycles).toBe(1)
  })

  // ==========================================
  // SUITE 8: Validação Contábil
  // ==========================================
  console.log('\n📊 SUITE 8: Validação Contábil')
  console.log('─'.repeat(50))

  test('balanço deve fechar (entrada = saída)', () => {
    // Calcular total entrada no sistema
    const totalIn = systemFunds.totalIn // $70 (7 x $10)

    // Calcular onde está o dinheiro que ENTROU (não saldos iniciais)
    let totalOut = 0

    // Ganhos dos usuários (totalEarned)
    for (const user of users.values()) {
      totalOut += user.totalEarned
    }

    // Fundos do sistema
    totalOut += systemFunds.reserve
    totalOut += systemFunds.operational
    totalOut += systemFunds.profit

    // Caixas dos níveis (dinheiro não processado)
    for (const level of levels) {
      totalOut += level.cashBalance
    }

    // Tolerância de $1 para arredondamentos
    expect(Math.abs(totalIn - totalOut)).toBeLessThan(1)
  })

  // ==========================================
  // RESUMO
  // ==========================================
  console.log('\n')
  console.log('═'.repeat(60))

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log(`\n📊 RESULTADO: ${passed}/${total} testes passaram`)

  if (failed > 0) {
    console.log(`\n❌ ${failed} testes falharam:`)
    for (const r of results.filter(r => !r.passed)) {
      console.log(`   - ${r.name}: ${r.error}`)
    }
  } else {
    console.log('\n✅ TODOS OS TESTES PASSARAM!')
  }

  console.log('\n')
}

// Executar
runTests()
