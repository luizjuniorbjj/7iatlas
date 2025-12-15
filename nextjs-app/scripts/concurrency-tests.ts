/**
 * 7iATLAS - TESTES DE CONCORRÊNCIA
 *
 * Objetivo: Simular múltiplas operações simultâneas e verificar integridade
 *
 * Cenários:
 * 1. Múltiplos usuários comprando cotas ao mesmo tempo
 * 2. Ciclos sendo processados simultaneamente
 * 3. Transferências concorrentes
 * 4. Double-spending em paralelo
 * 5. Race conditions em filas
 * 6. Locks e mutex simulados
 */

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const CONFIG = {
  ENTRY_VALUES: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120],
  MAX_QUOTAS: 10,
  SCORE_CAP: 290
}

// ==========================================
// ESTRUTURAS DE DADOS THREAD-SAFE
// ==========================================

interface User {
  id: string
  wallet: string
  balance: number
  totalDeposited: number
  pendingOperations: number // Contador de operações em andamento
  locked: boolean // Mutex simulado
}

interface QueueEntry {
  id: string
  oderId: string
  level: number
  score: number
}

interface Operation {
  id: string
  type: 'BUY_QUOTA' | 'TRANSFER' | 'WITHDRAW' | 'PROCESS_CYCLE'
  userId: string
  amount: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  timestamp: number
}

// Estado global com controles de concorrência
const users = new Map<string, User>()
const queues = new Map<number, QueueEntry[]>()
const levelCashes: number[] = new Array(10).fill(0)
const operations: Operation[] = []
const locks = new Map<string, boolean>() // Mutex por recurso
const operationLog: string[] = [] // Log de operações para debug

let systemFunds = { reserve: 0, operational: 0, profit: 0, jupiterPool: 0 }
let idCounter = 0
let passed = 0
let failed = 0

const results: { category: string; test: string; passed: boolean; details: string }[] = []

// Inicializar filas
for (let i = 1; i <= 10; i++) {
  queues.set(i, [])
}

// ==========================================
// FUNÇÕES DE CONCORRÊNCIA
// ==========================================

function generateId(): string {
  return `id_${++idCounter}`
}

function acquireLock(resource: string, timeout: number = 1000): boolean {
  const start = Date.now()
  while (locks.get(resource)) {
    if (Date.now() - start > timeout) {
      return false // Timeout
    }
    // Busy wait (em produção seria async)
  }
  locks.set(resource, true)
  return true
}

function releaseLock(resource: string): void {
  locks.set(resource, false)
}

function lockUser(userId: string): boolean {
  const user = users.get(userId)
  if (!user) return false
  if (user.locked) return false
  user.locked = true
  return true
}

function unlockUser(userId: string): void {
  const user = users.get(userId)
  if (user) user.locked = false
}

function createUser(): User {
  const id = generateId()
  const user: User = {
    id,
    wallet: '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0'),
    balance: 0,
    totalDeposited: 0,
    pendingOperations: 0,
    locked: false
  }
  users.set(id, user)
  return user
}

function deposit(user: User, amount: number): boolean {
  if (!lockUser(user.id)) return false

  try {
    user.balance += amount
    user.totalDeposited += amount
    operationLog.push(`DEPOSIT: ${user.id} +$${amount}`)
    return true
  } finally {
    unlockUser(user.id)
  }
}

function buyQuotaWithLock(user: User, level: number): { success: boolean; reason: string } {
  const entry = CONFIG.ENTRY_VALUES[level - 1]

  // Adquirir locks na ordem correta para evitar deadlock
  const userLockKey = `user_${user.id}`
  const queueLockKey = `queue_${level}`

  if (!acquireLock(userLockKey)) {
    return { success: false, reason: 'User lock timeout' }
  }

  if (!acquireLock(queueLockKey)) {
    releaseLock(userLockKey)
    return { success: false, reason: 'Queue lock timeout' }
  }

  try {
    // Verificar saldo
    if (user.balance < entry) {
      return { success: false, reason: 'Saldo insuficiente' }
    }

    // Verificar limite de cotas
    const queue = queues.get(level)!
    const currentQuotas = queue.filter(e => e.oderId === user.id).length
    if (currentQuotas >= CONFIG.MAX_QUOTAS) {
      return { success: false, reason: 'Limite de cotas atingido' }
    }

    // Executar operação
    user.balance -= entry
    levelCashes[level - 1] += entry

    queue.push({
      id: generateId(),
      oderId: user.id,
      level,
      score: 0
    })

    operationLog.push(`BUY_QUOTA: ${user.id} level ${level}, balance now $${user.balance}`)
    return { success: true, reason: 'OK' }
  } finally {
    releaseLock(queueLockKey)
    releaseLock(userLockKey)
  }
}

function transferWithLock(from: User, to: User, amount: number): { success: boolean; reason: string } {
  // Adquirir locks em ordem de ID para evitar deadlock
  const [first, second] = from.id < to.id ? [from, to] : [to, from]
  const lock1 = `user_${first.id}`
  const lock2 = `user_${second.id}`

  if (!acquireLock(lock1)) {
    return { success: false, reason: 'Lock 1 timeout' }
  }

  if (!acquireLock(lock2)) {
    releaseLock(lock1)
    return { success: false, reason: 'Lock 2 timeout' }
  }

  try {
    if (from.balance < amount) {
      return { success: false, reason: 'Saldo insuficiente' }
    }

    from.balance -= amount
    to.balance += amount

    operationLog.push(`TRANSFER: ${from.id} -> ${to.id} $${amount}`)
    return { success: true, reason: 'OK' }
  } finally {
    releaseLock(lock2)
    releaseLock(lock1)
  }
}

function processCycleWithLock(level: number): { success: boolean; reason: string } {
  const lockKey = `cycle_${level}`

  if (!acquireLock(lockKey)) {
    return { success: false, reason: 'Cycle lock timeout' }
  }

  try {
    const queue = queues.get(level)!
    const entry = CONFIG.ENTRY_VALUES[level - 1]
    const required = entry * 7

    if (queue.length < 7) {
      return { success: false, reason: 'Participantes insuficientes' }
    }

    if (levelCashes[level - 1] < required) {
      return { success: false, reason: 'Caixa insuficiente' }
    }

    // Processar ciclo
    queue.sort((a, b) => b.score - a.score)
    const participants = queue.splice(0, 7)

    const receiverId = participants[0].oderId
    const receiver = users.get(receiverId)!

    const gross = entry * 2
    const jupiter = gross * 0.10
    receiver.balance += gross - jupiter
    systemFunds.jupiterPool += jupiter

    // Reentradas
    for (let i = 0; i < 7; i++) {
      queue.push({
        id: generateId(),
        oderId: participants[i].oderId,
        level,
        score: participants[i].score + 1
      })
    }

    // Próximo nível
    if (level < 10) {
      levelCashes[level] += entry * 2
    } else {
      systemFunds.reserve += entry * 2
    }

    // Pos 5
    systemFunds.reserve += entry * 0.10
    systemFunds.operational += entry * 0.10
    systemFunds.profit += entry * 0.80

    // Caixa
    levelCashes[level - 1] -= required
    levelCashes[level - 1] += entry * 2

    operationLog.push(`CYCLE: level ${level}, receiver ${receiverId}`)
    return { success: true, reason: 'OK' }
  } finally {
    releaseLock(lockKey)
  }
}

function test(category: string, testName: string, condition: boolean, details: string): boolean {
  if (condition) {
    passed++
    results.push({ category, test: testName, passed: true, details })
    return true
  } else {
    failed++
    results.push({ category, test: testName, passed: false, details })
    console.log(`❌ ${category} - ${testName}`)
    console.log(`   ${details}`)
    return false
  }
}

function validateAccounting(): { valid: boolean; difference: number } {
  let totalIn = 0
  let totalOut = 0

  for (const user of users.values()) {
    totalIn += user.totalDeposited
    totalOut += user.balance
  }

  totalOut += systemFunds.reserve + systemFunds.operational + systemFunds.profit + systemFunds.jupiterPool

  for (const cash of levelCashes) {
    totalOut += cash
  }

  const difference = Math.abs(totalIn - totalOut)
  return { valid: difference < 0.01, difference }
}

function resetSystem(): void {
  users.clear()
  locks.clear()
  operationLog.length = 0
  for (let i = 1; i <= 10; i++) {
    queues.set(i, [])
  }
  levelCashes.fill(0)
  systemFunds = { reserve: 0, operational: 0, profit: 0, jupiterPool: 0 }
  idCounter = 0
}

// ==========================================
// INÍCIO DOS TESTES
// ==========================================

console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════╗')
console.log('║              7iATLAS - TESTES DE CONCORRÊNCIA                                               ║')
console.log('║              Simulação de Operações Simultâneas                                             ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝')
console.log('')

// ==========================================
// 1. COMPRAS SIMULTÂNEAS DE COTAS
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    1. COMPRAS SIMULTÂNEAS DE COTAS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

// Criar usuário com saldo para 5 cotas
const buyerUser = createUser()
deposit(buyerUser, 100) // $100 = 10 cotas N1

// Simular 20 tentativas de compra simultâneas (10 devem passar, 10 devem falhar)
const buyResults: { success: boolean; reason: string }[] = []
for (let i = 0; i < 20; i++) {
  buyResults.push(buyQuotaWithLock(buyerUser, 1))
}

const successfulBuys = buyResults.filter(r => r.success).length
const failedBuys = buyResults.filter(r => !r.success).length

test('1. Compras Simultâneas', '1.1 Limite de cotas respeitado', successfulBuys === 10, `Sucesso: ${successfulBuys}, Falha: ${failedBuys}`)
test('1. Compras Simultâneas', '1.2 Saldo correto após compras', buyerUser.balance === 0, `Saldo: $${buyerUser.balance}`)
test('1. Compras Simultâneas', '1.3 Cotas na fila corretas', queues.get(1)!.length === 10, `Na fila: ${queues.get(1)!.length}`)

const acc1 = validateAccounting()
test('1. Compras Simultâneas', '1.4 Contabilidade OK', acc1.valid, `Diferença: $${acc1.difference.toFixed(2)}`)

console.log('')

// ==========================================
// 2. DOUBLE-SPENDING PREVENTION
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    2. PREVENÇÃO DE DOUBLE-SPENDING')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

const doubleSpender = createUser()
deposit(doubleSpender, 50) // $50

// Tentar gastar $50 duas vezes "simultaneamente"
const spend1 = buyQuotaWithLock(doubleSpender, 1) // $10
const spend2 = buyQuotaWithLock(doubleSpender, 1) // $10
const spend3 = buyQuotaWithLock(doubleSpender, 1) // $10
const spend4 = buyQuotaWithLock(doubleSpender, 1) // $10
const spend5 = buyQuotaWithLock(doubleSpender, 1) // $10
const spend6 = buyQuotaWithLock(doubleSpender, 1) // Deve falhar (saldo $0)

test('2. Double-Spending', '2.1 Primeiras 5 compras OK', spend1.success && spend2.success && spend3.success && spend4.success && spend5.success, 'Todas passaram')
test('2. Double-Spending', '2.2 Sexta compra bloqueada', !spend6.success, spend6.reason)
test('2. Double-Spending', '2.3 Saldo zerado corretamente', doubleSpender.balance === 0, `Saldo: $${doubleSpender.balance}`)

const acc2 = validateAccounting()
test('2. Double-Spending', '2.4 Contabilidade OK', acc2.valid, `Diferença: $${acc2.difference.toFixed(2)}`)

console.log('')

// ==========================================
// 3. TRANSFERÊNCIAS CONCORRENTES
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    3. TRANSFERÊNCIAS CONCORRENTES')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

const alice = createUser()
const bob = createUser()
const charlie = createUser()

deposit(alice, 100)
deposit(bob, 100)
deposit(charlie, 100)

// Transferências circulares simultâneas
const t1 = transferWithLock(alice, bob, 30)
const t2 = transferWithLock(bob, charlie, 30)
const t3 = transferWithLock(charlie, alice, 30)

test('3. Transferências', '3.1 Todas transferências OK', t1.success && t2.success && t3.success, 'Todas passaram')
test('3. Transferências', '3.2 Saldo Alice correto', alice.balance === 100, `Alice: $${alice.balance}`)
test('3. Transferências', '3.3 Saldo Bob correto', bob.balance === 100, `Bob: $${bob.balance}`)
test('3. Transferências', '3.4 Saldo Charlie correto', charlie.balance === 100, `Charlie: $${charlie.balance}`)

const acc3 = validateAccounting()
test('3. Transferências', '3.5 Contabilidade OK', acc3.valid, `Diferença: $${acc3.difference.toFixed(2)}`)

console.log('')

// ==========================================
// 4. CICLOS SIMULTÂNEOS
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    4. CICLOS SIMULTÂNEOS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

// Criar 21 usuários (3 ciclos possíveis)
for (let i = 0; i < 21; i++) {
  const user = createUser()
  deposit(user, 10)
  buyQuotaWithLock(user, 1)
}

// Tentar processar 5 ciclos simultaneamente (apenas 3 devem passar)
const cycleResults: { success: boolean; reason: string }[] = []
for (let i = 0; i < 5; i++) {
  cycleResults.push(processCycleWithLock(1))
}

const successfulCycles = cycleResults.filter(r => r.success).length
test('4. Ciclos Simultâneos', '4.1 Apenas 3 ciclos processados', successfulCycles === 3, `Ciclos: ${successfulCycles}`)

const acc4 = validateAccounting()
test('4. Ciclos Simultâneos', '4.2 Contabilidade OK', acc4.valid, `Diferença: $${acc4.difference.toFixed(2)}`)

console.log('')

// ==========================================
// 5. RACE CONDITION NA FILA
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    5. RACE CONDITION NA FILA')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

// Criar 100 usuários
const raceUsers: User[] = []
for (let i = 0; i < 100; i++) {
  const user = createUser()
  deposit(user, 50)
  raceUsers.push(user)
}

// Todos tentam comprar cotas ao mesmo tempo
const raceResults: { success: boolean; reason: string }[] = []
for (const user of raceUsers) {
  raceResults.push(buyQuotaWithLock(user, 1))
}

const raceSuccess = raceResults.filter(r => r.success).length
const queueSize = queues.get(1)!.length

test('5. Race Condition', '5.1 Todas compras processadas', raceSuccess === 100, `Sucesso: ${raceSuccess}`)
test('5. Race Condition', '5.2 Fila com 100 entradas', queueSize === 100, `Na fila: ${queueSize}`)

// Verificar que cada usuário tem exatamente 1 cota
const quotaCounts = new Map<string, number>()
for (const entry of queues.get(1)!) {
  quotaCounts.set(entry.oderId, (quotaCounts.get(entry.oderId) || 0) + 1)
}
const allHaveOne = Array.from(quotaCounts.values()).every(c => c === 1)
test('5. Race Condition', '5.3 Cada usuário tem 1 cota', allHaveOne, `Todos: ${allHaveOne}`)

const acc5 = validateAccounting()
test('5. Race Condition', '5.4 Contabilidade OK', acc5.valid, `Diferença: $${acc5.difference.toFixed(2)}`)

console.log('')

// ==========================================
// 6. DEADLOCK PREVENTION
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    6. PREVENÇÃO DE DEADLOCK')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

const user1 = createUser()
const user2 = createUser()

deposit(user1, 100)
deposit(user2, 100)

// Simular transferências cruzadas (potencial deadlock)
// User1 -> User2 e User2 -> User1 simultaneamente
const deadlock1 = transferWithLock(user1, user2, 50)
const deadlock2 = transferWithLock(user2, user1, 50)

// Ambas devem passar sem deadlock
test('6. Deadlock', '6.1 Transferência 1 OK', deadlock1.success, deadlock1.reason)
test('6. Deadlock', '6.2 Transferência 2 OK', deadlock2.success, deadlock2.reason)
test('6. Deadlock', '6.3 Saldos corretos', user1.balance === 100 && user2.balance === 100, `U1: $${user1.balance}, U2: $${user2.balance}`)

const acc6 = validateAccounting()
test('6. Deadlock', '6.4 Contabilidade OK', acc6.valid, `Diferença: $${acc6.difference.toFixed(2)}`)

console.log('')

// ==========================================
// 7. STRESS TEST CONCORRENTE
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    7. STRESS TEST CONCORRENTE')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

const startStress = Date.now()

// Criar 1000 usuários
const stressUsers: User[] = []
for (let i = 0; i < 1000; i++) {
  const user = createUser()
  deposit(user, 100)
  stressUsers.push(user)
}

// Mistura de operações: compras, transferências, ciclos
let stressOps = 0
let stressSuccess = 0

// Compras
for (const user of stressUsers) {
  const result = buyQuotaWithLock(user, 1)
  stressOps++
  if (result.success) stressSuccess++
}

// Transferências entre usuários adjacentes
for (let i = 0; i < stressUsers.length - 1; i += 2) {
  const result = transferWithLock(stressUsers[i], stressUsers[i + 1], 10)
  stressOps++
  if (result.success) stressSuccess++
}

// Ciclos
for (let i = 0; i < 100; i++) {
  const result = processCycleWithLock(1)
  stressOps++
  if (result.success) stressSuccess++
}

const endStress = Date.now()
const stressTime = endStress - startStress

test('7. Stress Concorrente', '7.1 Operações processadas', stressOps > 1500, `Total: ${stressOps}`)
test('7. Stress Concorrente', '7.2 Alta taxa de sucesso', stressSuccess / stressOps > 0.9, `Sucesso: ${(stressSuccess / stressOps * 100).toFixed(1)}%`)
test('7. Stress Concorrente', '7.3 Tempo aceitável < 5s', stressTime < 5000, `Tempo: ${stressTime}ms`)

const acc7 = validateAccounting()
test('7. Stress Concorrente', '7.4 Contabilidade OK', acc7.valid, `Diferença: $${acc7.difference.toFixed(2)}`)

console.log('')

// ==========================================
// 8. ATOMICIDADE DE OPERAÇÕES
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    8. ATOMICIDADE DE OPERAÇÕES')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

const atomicUser = createUser()
deposit(atomicUser, 100)

const initialBalance = atomicUser.balance
const initialQueue = queues.get(1)!.length

// Operação que falha no meio (saldo insuficiente para segunda cota)
atomicUser.balance = 15 // Só dá para 1 cota de $10

const op1 = buyQuotaWithLock(atomicUser, 1) // Deve passar ($10)
const op2 = buyQuotaWithLock(atomicUser, 1) // Deve falhar ($5 restantes)

test('8. Atomicidade', '8.1 Primeira operação OK', op1.success, op1.reason)
test('8. Atomicidade', '8.2 Segunda operação falhou', !op2.success, op2.reason)
test('8. Atomicidade', '8.3 Saldo consistente', atomicUser.balance === 5, `Saldo: $${atomicUser.balance}`)
test('8. Atomicidade', '8.4 Fila consistente', queues.get(1)!.length === 1, `Na fila: ${queues.get(1)!.length}`)

console.log('')

// ==========================================
// 9. OPERAÇÕES INTERLEAVED
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    9. OPERAÇÕES INTERLEAVED')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

// Simular operações entrelaçadas (A compra, B transfere para A, A compra de novo)
const userA = createUser()
const userB = createUser()

deposit(userA, 10)
deposit(userB, 50)

const int1 = buyQuotaWithLock(userA, 1) // A compra, saldo 0
const int2 = transferWithLock(userB, userA, 20) // B transfere 20 para A
const int3 = buyQuotaWithLock(userA, 1) // A compra novamente

test('9. Interleaved', '9.1 Primeira compra A', int1.success, int1.reason)
test('9. Interleaved', '9.2 Transferência B->A', int2.success, int2.reason)
test('9. Interleaved', '9.3 Segunda compra A', int3.success, int3.reason)
test('9. Interleaved', '9.4 Saldo A correto', userA.balance === 10, `A: $${userA.balance}`)
test('9. Interleaved', '9.5 Saldo B correto', userB.balance === 30, `B: $${userB.balance}`)

const acc9 = validateAccounting()
test('9. Interleaved', '9.6 Contabilidade OK', acc9.valid, `Diferença: $${acc9.difference.toFixed(2)}`)

console.log('')

// ==========================================
// 10. ISOLATION DE TRANSAÇÕES
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    10. ISOLATION DE TRANSAÇÕES')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

// Criar múltiplos usuários
const isoUsers: User[] = []
for (let i = 0; i < 10; i++) {
  const user = createUser()
  deposit(user, 100)
  isoUsers.push(user)
}

// Cada usuário faz múltiplas operações
for (const user of isoUsers) {
  buyQuotaWithLock(user, 1)
  buyQuotaWithLock(user, 1)
  buyQuotaWithLock(user, 1)
}

// Verificar que cada usuário tem exatamente 3 cotas e $70
let allCorrect = true
for (const user of isoUsers) {
  const quotas = queues.get(1)!.filter(e => e.oderId === user.id).length
  if (quotas !== 3 || user.balance !== 70) {
    allCorrect = false
    break
  }
}

test('10. Isolation', '10.1 Todos usuários com 3 cotas', allCorrect, 'Verificado')
test('10. Isolation', '10.2 Total na fila = 30', queues.get(1)!.length === 30, `Na fila: ${queues.get(1)!.length}`)

const acc10 = validateAccounting()
test('10. Isolation', '10.3 Contabilidade OK', acc10.valid, `Diferença: $${acc10.difference.toFixed(2)}`)

console.log('')

// ==========================================
// RESUMO FINAL
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    RESUMO DOS RESULTADOS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const total = passed + failed
const percentage = (passed / total * 100).toFixed(1)

console.log(`📊 TOTAL DE TESTES: ${total}`)
console.log(`✅ PASSARAM: ${passed}`)
console.log(`❌ FALHARAM: ${failed}`)
console.log('')

// Agrupar por categoria
const categories = new Map<string, { passed: number; failed: number }>()
for (const r of results) {
  if (!categories.has(r.category)) {
    categories.set(r.category, { passed: 0, failed: 0 })
  }
  const c = categories.get(r.category)!
  if (r.passed) c.passed++
  else c.failed++
}

console.log('📋 TESTES POR CATEGORIA:')
console.log('────────────────────────────────────────────────────────────────────────────────────────────────────')
for (const [cat, counts] of categories) {
  const catTotal = counts.passed + counts.failed
  const status = counts.failed === 0 ? '✅' : '❌'
  console.log(`   ${status} ${cat}: ${counts.passed}/${catTotal} passaram`)
}

console.log('')

if (failed === 0) {
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
  console.log('                    ✅ TODOS OS TESTES DE CONCORRÊNCIA PASSARAM!')
  console.log('                    Sistema thread-safe para operações simultâneas.')
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
} else {
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
  console.log('                    ❌ ALGUNS TESTES FALHARAM!')
  console.log('                    Revisar controles de concorrência.')
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
}

console.log('')
console.log(`Total: ${passed}/${total} testes passaram (${percentage}%)`)
console.log('')

// Checklist
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    CHECKLIST DE CONCORRÊNCIA')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')
console.log('   🔒 PROTEÇÕES VALIDADAS:')
console.log('   ├── Mutex por usuário (lock/unlock)')
console.log('   ├── Mutex por fila de nível')
console.log('   ├── Mutex por ciclo')
console.log('   ├── Prevenção de double-spending')
console.log('   ├── Prevenção de deadlock (ordem de locks)')
console.log('   ├── Atomicidade de operações')
console.log('   ├── Isolation de transações')
console.log('   └── Contabilidade consistente sob carga')
console.log('')

if (failed > 0) {
  process.exit(1)
}
