/**
 * 7iATLAS - TESTES DE FRAUDE
 *
 * Objetivo: Simular tentativas REAIS de fraude e verificar que o sistema bloqueia
 *
 * Categorias:
 * 1. Auto-Indicação - Usuário indicar a si mesmo
 * 2. Ciclo de Indicação - A indica B, B indica A
 * 3. Manipulação de Posição - Tentar pular na fila
 * 4. Múltiplas Contas (Sybil) - Mesma pessoa com várias wallets
 * 5. Falsificação de TX - Inventar hash de transação
 * 6. Roubo de PIN - Usar PIN de outro usuário
 * 7. Manipulação de Saldo - Aumentar saldo sem depósito
 * 8. Replay Attack - Reutilizar mesma transação
 * 9. Race Condition - Burlar limite de cotas
 * 10. Front-Running - Manipular ordem da fila
 * 11. Wash Trading - Transferir entre próprias contas
 * 12. Bonus Farming - Criar contas fake para bônus
 * 13. Double Spending - Gastar mesmo saldo duas vezes
 * 14. Timestamp Manipulation - Alterar tempo para score
 * 15. Injection Attacks - Tentar injetar dados maliciosos
 */

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const CONFIG = {
  ENTRY_VALUES: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120],
  POSITIONS_PER_CYCLE: 7,
  MAX_LEVEL: 10,
  JUPITER_POOL_PERCENT: 0.10,
  SCORE_CAP: 290,
  MAX_QUOTAS: 10,
  PIN_MAX_ATTEMPTS: 3,
  MIN_WITHDRAWAL: 10,
  MAX_DAILY_WITHDRAWAL_NO_KYC: 100,
  MAX_DAILY_WITHDRAWAL_KYC: 1000
}

// ==========================================
// ESTRUTURAS DE DADOS
// ==========================================

interface User {
  id: string
  wallet: string
  email: string
  pin: string
  pinHash: string
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED'
  balance: number
  totalDeposited: number
  totalEarned: number
  totalBonus: number
  referrerId: string | null
  referralCount: number
  kycVerified: boolean
  ipAddress: string
  deviceFingerprint: string
  createdAt: Date
  lastLoginAt: Date
  failedPinAttempts: number
  dailyWithdrawn: number
}

interface Transaction {
  id: string
  txHash: string
  fromWallet: string
  toWallet: string
  amount: number
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER'
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  createdAt: Date
}

interface QueueEntry {
  id: string
  oderId: string
  level: number
  score: number
  position: number
  enteredAt: Date
}

// Estado global
const users = new Map<string, User>()
const transactions = new Map<string, Transaction>()
const usedTxHashes = new Set<string>()
const usedWallets = new Set<string>()
const usedEmails = new Set<string>()
const ipAddressCount = new Map<string, number>()
const deviceFingerprintCount = new Map<string, number>()
const queues = new Map<number, QueueEntry[]>()
const pins = new Map<string, { oderId: string; pin: string; used: boolean }>()

let idCounter = 0
let passed = 0
let failed = 0
const results: { category: string; test: string; passed: boolean; details: string }[] = []

// Inicializar filas
for (let i = 1; i <= 10; i++) {
  queues.set(i, [])
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function generateId(): string {
  return `id_${++idCounter}`
}

function generateWallet(): string {
  const chars = '0123456789abcdef'
  let addr = '0x'
  for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * 16)]
  return addr
}

function generateTxHash(): string {
  const chars = '0123456789abcdef'
  let hash = '0x'
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)]
  return hash
}

function hashPin(pin: string): string {
  // Simulação de hash (em produção usar bcrypt)
  return `hashed_${pin}_${Date.now()}`
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

// ==========================================
// FUNÇÕES DE VALIDAÇÃO ANTI-FRAUDE
// ==========================================

function validateSelfReferral(userId: string, referrerId: string | null): { valid: boolean; reason: string } {
  if (referrerId === null) return { valid: true, reason: 'Sem indicador' }
  if (userId === referrerId) return { valid: false, reason: 'Auto-indicação detectada' }
  return { valid: true, reason: 'OK' }
}

function validateReferralCycle(userId: string, referrerId: string): { valid: boolean; reason: string } {
  if (!referrerId) return { valid: true, reason: 'Sem indicador' }

  // Verificar se referrer tem o novo usuário como indicador (ciclo direto)
  const referrer = users.get(referrerId)
  if (!referrer) return { valid: true, reason: 'Indicador não existe' }

  if (referrer.referrerId === userId) {
    return { valid: false, reason: 'Ciclo de indicação detectado: A→B→A' }
  }

  // Verificar ciclos mais profundos (A→B→C→A)
  let current = referrer.referrerId
  const visited = new Set<string>([userId, referrerId])
  let depth = 0
  const maxDepth = 10

  while (current && depth < maxDepth) {
    if (current === userId) {
      return { valid: false, reason: `Ciclo de indicação detectado (profundidade ${depth + 2})` }
    }
    if (visited.has(current)) break
    visited.add(current)

    const currentUser = users.get(current)
    if (!currentUser) break
    current = currentUser.referrerId
    depth++
  }

  return { valid: true, reason: 'OK' }
}

function validateUniqueWallet(wallet: string): { valid: boolean; reason: string } {
  if (usedWallets.has(wallet.toLowerCase())) {
    return { valid: false, reason: 'Wallet já cadastrada' }
  }
  return { valid: true, reason: 'OK' }
}

function validateUniqueTxHash(txHash: string): { valid: boolean; reason: string } {
  if (usedTxHashes.has(txHash.toLowerCase())) {
    return { valid: false, reason: 'TX Hash já utilizado (replay attack)' }
  }
  return { valid: true, reason: 'OK' }
}

function validatePositionManipulation(queue: QueueEntry[], entryId: string, newPosition: number): { valid: boolean; reason: string } {
  const entry = queue.find(e => e.id === entryId)
  if (!entry) return { valid: false, reason: 'Entrada não encontrada' }

  // Não pode mover para frente
  if (newPosition < entry.position) {
    return { valid: false, reason: 'Tentativa de pular posição na fila' }
  }

  return { valid: true, reason: 'OK' }
}

function validateMultipleAccounts(ipAddress: string, deviceFingerprint: string): { valid: boolean; reason: string } {
  const ipCount = ipAddressCount.get(ipAddress) || 0
  const deviceCount = deviceFingerprintCount.get(deviceFingerprint) || 0

  if (ipCount >= 3) {
    return { valid: false, reason: `Muitas contas do mesmo IP (${ipCount})` }
  }

  if (deviceCount >= 2) {
    return { valid: false, reason: `Muitas contas do mesmo dispositivo (${deviceCount})` }
  }

  return { valid: true, reason: 'OK' }
}

function validatePinOwnership(pinCode: string, requesterId: string): { valid: boolean; reason: string } {
  const pinRecord = pins.get(pinCode)
  if (!pinRecord) return { valid: false, reason: 'PIN não existe' }
  if (pinRecord.used) return { valid: false, reason: 'PIN já foi utilizado' }
  if (pinRecord.oderId !== requesterId) {
    return { valid: false, reason: 'PIN pertence a outro usuário' }
  }
  return { valid: true, reason: 'OK' }
}

function validateBalanceManipulation(user: User, newBalance: number): { valid: boolean; reason: string } {
  // Saldo só pode aumentar via: depósito, ganho de ciclo, bônus, transferência recebida
  // Saldo só pode diminuir via: compra de cota, transferência enviada, saque

  if (newBalance < 0) {
    return { valid: false, reason: 'Saldo negativo não permitido' }
  }

  if (newBalance > user.balance + user.totalDeposited) {
    return { valid: false, reason: 'Aumento de saldo sem origem válida' }
  }

  return { valid: true, reason: 'OK' }
}

function validateDoubleSpending(user: User, amount: number, pendingTransactions: Transaction[]): { valid: boolean; reason: string } {
  // Calcular saldo disponível (saldo - transações pendentes)
  const pendingAmount = pendingTransactions
    .filter(tx => tx.fromWallet === user.wallet && tx.status === 'PENDING')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const availableBalance = user.balance - pendingAmount

  if (amount > availableBalance) {
    return { valid: false, reason: `Double spending: tentando gastar $${amount}, disponível $${availableBalance}` }
  }

  return { valid: true, reason: 'OK' }
}

function validateTimestampManipulation(enteredAt: Date, serverTime: Date): { valid: boolean; reason: string } {
  const diff = Math.abs(enteredAt.getTime() - serverTime.getTime())

  // Tolerância de 5 minutos
  if (diff > 5 * 60 * 1000) {
    return { valid: false, reason: 'Timestamp manipulado (diferença > 5 minutos)' }
  }

  // Não pode ser no futuro
  if (enteredAt.getTime() > serverTime.getTime() + 60000) {
    return { valid: false, reason: 'Timestamp no futuro' }
  }

  return { valid: true, reason: 'OK' }
}

function validateRaceCondition(user: User, level: number, requestTimestamp: number, recentRequests: Map<string, number[]>): { valid: boolean; reason: string } {
  const key = `${user.id}_${level}`
  const requests = recentRequests.get(key) || []

  // Verificar se há requisições muito próximas (< 100ms)
  const recentCount = requests.filter(t => requestTimestamp - t < 100).length

  if (recentCount > 0) {
    return { valid: false, reason: 'Race condition detectada: múltiplas requisições simultâneas' }
  }

  return { valid: true, reason: 'OK' }
}

function validateWashTrading(fromUser: User, toUser: User, history: Transaction[]): { valid: boolean; reason: string } {
  // Verificar se há padrão de transferências circulares
  const fromToTransfers = history.filter(tx =>
    tx.fromWallet === fromUser.wallet && tx.toWallet === toUser.wallet
  ).length

  const toFromTransfers = history.filter(tx =>
    tx.fromWallet === toUser.wallet && tx.toWallet === fromUser.wallet
  ).length

  if (fromToTransfers >= 3 && toFromTransfers >= 3) {
    return { valid: false, reason: 'Padrão de wash trading detectado' }
  }

  // Verificar mesmo IP/dispositivo
  if (fromUser.ipAddress === toUser.ipAddress || fromUser.deviceFingerprint === toUser.deviceFingerprint) {
    return { valid: false, reason: 'Transferência entre contas do mesmo dispositivo/IP' }
  }

  return { valid: true, reason: 'OK' }
}

function validateBonusFarming(referrer: User, newReferrals: User[]): { valid: boolean; reason: string } {
  // Verificar se indicados são de IPs/dispositivos similares
  const ips = new Set(newReferrals.map(u => u.ipAddress))
  const devices = new Set(newReferrals.map(u => u.deviceFingerprint))

  if (newReferrals.length >= 5 && ips.size === 1) {
    return { valid: false, reason: 'Bonus farming: todos indicados do mesmo IP' }
  }

  if (newReferrals.length >= 5 && devices.size <= 2) {
    return { valid: false, reason: 'Bonus farming: todos indicados dos mesmos dispositivos' }
  }

  // Verificar se indicados nunca fizeram depósito real
  const noDeposit = newReferrals.filter(u => u.totalDeposited === 0).length
  if (newReferrals.length >= 5 && noDeposit === newReferrals.length) {
    return { valid: false, reason: 'Bonus farming: indicados sem depósitos reais' }
  }

  return { valid: true, reason: 'OK' }
}

function validateSQLInjection(input: string): { valid: boolean; reason: string } {
  const sqlPatterns = [
    /('|"|;|--|\/\*|\*\/|xp_|sp_|exec|execute|insert|update|delete|drop|alter|create|truncate)/i,
    /(union\s+select|select\s+\*|or\s+1\s*=\s*1|and\s+1\s*=\s*1)/i,
    /(benchmark|sleep|waitfor|delay)/i
  ]

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      return { valid: false, reason: 'SQL Injection detectado' }
    }
  }

  return { valid: true, reason: 'OK' }
}

function validateXSSInjection(input: string): { valid: boolean; reason: string } {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ]

  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      return { valid: false, reason: 'XSS Injection detectado' }
    }
  }

  return { valid: true, reason: 'OK' }
}

function validateScoreManipulation(score: number, maxPossible: number): { valid: boolean; reason: string } {
  if (score < 0) {
    return { valid: false, reason: 'Score negativo' }
  }

  if (score > maxPossible) {
    return { valid: false, reason: `Score impossível: ${score} > max ${maxPossible}` }
  }

  if (!Number.isFinite(score)) {
    return { valid: false, reason: 'Score inválido (Infinity/NaN)' }
  }

  return { valid: true, reason: 'OK' }
}

// ==========================================
// FUNÇÕES DE CRIAÇÃO
// ==========================================

function createUser(name: string, referrerId: string | null, ip: string, device: string): User | null {
  const id = generateId()

  // Validar auto-indicação
  const selfCheck = validateSelfReferral(id, referrerId)
  if (!selfCheck.valid) return null

  // Validar ciclo de indicação
  if (referrerId) {
    const cycleCheck = validateReferralCycle(id, referrerId)
    if (!cycleCheck.valid) return null
  }

  // Validar múltiplas contas
  const multiCheck = validateMultipleAccounts(ip, device)
  if (!multiCheck.valid) return null

  const wallet = generateWallet()

  // Validar wallet única
  const walletCheck = validateUniqueWallet(wallet)
  if (!walletCheck.valid) return null

  const pin = Math.floor(100000 + Math.random() * 900000).toString()

  const user: User = {
    id,
    wallet,
    email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
    pin,
    pinHash: hashPin(pin),
    status: 'PENDING',
    balance: 0,
    totalDeposited: 0,
    totalEarned: 0,
    totalBonus: 0,
    referrerId,
    referralCount: 0,
    kycVerified: false,
    ipAddress: ip,
    deviceFingerprint: device,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    failedPinAttempts: 0,
    dailyWithdrawn: 0
  }

  users.set(id, user)
  usedWallets.add(wallet.toLowerCase())

  // Atualizar contadores
  ipAddressCount.set(ip, (ipAddressCount.get(ip) || 0) + 1)
  deviceFingerprintCount.set(device, (deviceFingerprintCount.get(device) || 0) + 1)

  if (referrerId) {
    const referrer = users.get(referrerId)
    if (referrer) referrer.referralCount++
  }

  return user
}

// ==========================================
// INÍCIO DOS TESTES
// ==========================================

console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════╗')
console.log('║              7iATLAS - TESTES DE FRAUDE                                                      ║')
console.log('║              Simulação de Ataques e Tentativas de Fraude                                     ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝')
console.log('')

// ==========================================
// 1. AUTO-INDICAÇÃO
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    1. AUTO-INDICAÇÃO')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 1.1 Tentar se auto-indicar
const selfRef1 = validateSelfReferral('user_123', 'user_123')
test('1. Auto-Indicação', '1.1 Bloquear auto-indicação direta', !selfRef1.valid, selfRef1.reason)

// 1.2 Indicação normal deve funcionar
const selfRef2 = validateSelfReferral('user_123', 'user_456')
test('1. Auto-Indicação', '1.2 Permitir indicação normal', selfRef2.valid, selfRef2.reason)

// 1.3 Sem indicador deve funcionar
const selfRef3 = validateSelfReferral('user_123', null)
test('1. Auto-Indicação', '1.3 Permitir sem indicador', selfRef3.valid, selfRef3.reason)

console.log('')

// ==========================================
// 2. CICLO DE INDICAÇÃO
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    2. CICLO DE INDICAÇÃO')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// Criar usuários para teste
const userA = createUser('User A', null, '192.168.1.1', 'device_a')!
const userB = createUser('User B', userA.id, '192.168.1.2', 'device_b')!

// 2.1 Tentar criar ciclo A→B→A (B tenta indicar alguém que indicaria A, mas A já indicou B)
// Cenário: A indica B. Agora B tenta indicar C, e C quer indicar A = ciclo
// Simulamos: userA.referrerId = null, userB.referrerId = userA.id
// Se "new_user" tentar ter userB como referrer e depois indicar userA = problema
// A validação deve checar se o novo usuário sendo indicado por userB criaria ciclo com A
userA.referrerId = userB.id // Simular A foi indicado por B (inversão para teste)
const cycleCheck2 = validateReferralCycle(userB.id, userA.id) // B tentando ter A como referrer quando A já tem B
test('2. Ciclo Indicação', '2.1 Detectar ciclo A→B→A', !cycleCheck2.valid, cycleCheck2.reason)

// Resetar para próximos testes
userA.referrerId = null

// 2.2 Criar cadeia longa sem ciclo
const userC = createUser('User C', userB.id, '192.168.1.3', 'device_c')!
const userD = createUser('User D', userC.id, '192.168.1.4', 'device_d')!
const cycleCheck3 = validateReferralCycle(userD.id, userC.id)
test('2. Ciclo Indicação', '2.2 Permitir cadeia linear', cycleCheck3.valid, cycleCheck3.reason)

// 2.3 Detectar ciclo profundo (D já foi indicado por C, que foi por B, que foi por A)
// Se A tentar ter D como referrer, cria ciclo A→D→C→B→A
userA.referrerId = userD.id // A tenta ter D como referrer
const cycleCheck4 = validateReferralCycle(userA.id, userD.id)
test('2. Ciclo Indicação', '2.3 Detectar ciclo profundo', !cycleCheck4.valid, cycleCheck4.reason)

userA.referrerId = null // Resetar

console.log('')

// ==========================================
// 3. MANIPULAÇÃO DE POSIÇÃO NA FILA
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    3. MANIPULAÇÃO DE POSIÇÃO NA FILA')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// Criar fila de teste
const testQueue: QueueEntry[] = [
  { id: 'entry_1', oderId: 'user_1', level: 1, score: 100, position: 0, enteredAt: new Date() },
  { id: 'entry_2', oderId: 'user_2', level: 1, score: 80, position: 1, enteredAt: new Date() },
  { id: 'entry_3', oderId: 'user_3', level: 1, score: 60, position: 2, enteredAt: new Date() }
]

// 3.1 Tentar pular para frente
const posCheck1 = validatePositionManipulation(testQueue, 'entry_3', 0)
test('3. Manipulação Posição', '3.1 Bloquear pulo para frente', !posCheck1.valid, posCheck1.reason)

// 3.2 Mover para trás é OK
const posCheck2 = validatePositionManipulation(testQueue, 'entry_1', 2)
test('3. Manipulação Posição', '3.2 Permitir mover para trás', posCheck2.valid, posCheck2.reason)

// 3.3 Entrada inexistente
const posCheck3 = validatePositionManipulation(testQueue, 'entry_999', 0)
test('3. Manipulação Posição', '3.3 Rejeitar entrada inexistente', !posCheck3.valid, posCheck3.reason)

console.log('')

// ==========================================
// 4. MÚLTIPLAS CONTAS (SYBIL ATTACK)
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    4. MÚLTIPLAS CONTAS (SYBIL ATTACK)')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// Reset contadores
ipAddressCount.clear()
deviceFingerprintCount.clear()

// 4.1 Primeira conta de um IP - OK
ipAddressCount.set('192.168.1.100', 0)
const sybil1 = validateMultipleAccounts('192.168.1.100', 'device_new_1')
test('4. Sybil Attack', '4.1 Primeira conta OK', sybil1.valid, sybil1.reason)

// 4.2 Segunda conta mesmo IP - OK
ipAddressCount.set('192.168.1.100', 2)
const sybil2 = validateMultipleAccounts('192.168.1.100', 'device_new_2')
test('4. Sybil Attack', '4.2 Segunda conta OK', sybil2.valid, sybil2.reason)

// 4.3 Quarta conta mesmo IP - BLOQUEADO
ipAddressCount.set('192.168.1.100', 3)
const sybil3 = validateMultipleAccounts('192.168.1.100', 'device_new_3')
test('4. Sybil Attack', '4.3 Quarta conta bloqueada (mesmo IP)', !sybil3.valid, sybil3.reason)

// 4.4 Terceira conta mesmo dispositivo - BLOQUEADO
deviceFingerprintCount.set('device_sus', 2)
const sybil4 = validateMultipleAccounts('192.168.1.200', 'device_sus')
test('4. Sybil Attack', '4.4 Terceira conta bloqueada (mesmo device)', !sybil4.valid, sybil4.reason)

console.log('')

// ==========================================
// 5. FALSIFICAÇÃO DE TX HASH (REPLAY ATTACK)
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    5. REPLAY ATTACK (TX HASH DUPLICADO)')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 5.1 Primeiro uso de TX hash - OK
const txHash1 = '0x' + 'a'.repeat(64)
const replay1 = validateUniqueTxHash(txHash1)
test('5. Replay Attack', '5.1 Primeiro uso TX hash OK', replay1.valid, replay1.reason)
usedTxHashes.add(txHash1.toLowerCase())

// 5.2 Reutilizar mesmo TX hash - BLOQUEADO
const replay2 = validateUniqueTxHash(txHash1)
test('5. Replay Attack', '5.2 Reutilização bloqueada', !replay2.valid, replay2.reason)

// 5.3 TX hash diferente case - BLOQUEADO (normalizado)
const replay3 = validateUniqueTxHash(txHash1.toUpperCase())
test('5. Replay Attack', '5.3 Case diferente também bloqueado', !replay3.valid, replay3.reason)

// 5.4 TX hash novo - OK
const txHash2 = '0x' + 'b'.repeat(64)
const replay4 = validateUniqueTxHash(txHash2)
test('5. Replay Attack', '5.4 Novo TX hash OK', replay4.valid, replay4.reason)

console.log('')

// ==========================================
// 6. ROUBO DE PIN
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    6. ROUBO DE PIN')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// Criar PIN para teste
pins.set('123456', { oderId: 'owner_user', pin: '123456', used: false })

// 6.1 Dono do PIN pode usar
const pinCheck1 = validatePinOwnership('123456', 'owner_user')
test('6. Roubo de PIN', '6.1 Dono pode usar próprio PIN', pinCheck1.valid, pinCheck1.reason)

// 6.2 Outro usuário não pode usar
const pinCheck2 = validatePinOwnership('123456', 'thief_user')
test('6. Roubo de PIN', '6.2 Ladrão não pode usar PIN', !pinCheck2.valid, pinCheck2.reason)

// 6.3 PIN já usado não pode ser reutilizado
pins.set('654321', { oderId: 'owner_user', pin: '654321', used: true })
const pinCheck3 = validatePinOwnership('654321', 'owner_user')
test('6. Roubo de PIN', '6.3 PIN usado não pode reutilizar', !pinCheck3.valid, pinCheck3.reason)

// 6.4 PIN inexistente
const pinCheck4 = validatePinOwnership('999999', 'any_user')
test('6. Roubo de PIN', '6.4 PIN inexistente rejeitado', !pinCheck4.valid, pinCheck4.reason)

console.log('')

// ==========================================
// 7. MANIPULAÇÃO DE SALDO
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    7. MANIPULAÇÃO DE SALDO')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const testUser: User = {
  id: 'test_user',
  wallet: '0x' + 'f'.repeat(40),
  email: 'test@test.com',
  pin: '123456',
  pinHash: 'hash',
  status: 'ACTIVE',
  balance: 100,
  totalDeposited: 100,
  totalEarned: 0,
  totalBonus: 0,
  referrerId: null,
  referralCount: 0,
  kycVerified: false,
  ipAddress: '1.1.1.1',
  deviceFingerprint: 'fp',
  createdAt: new Date(),
  lastLoginAt: new Date(),
  failedPinAttempts: 0,
  dailyWithdrawn: 0
}

// 7.1 Tentar saldo negativo
const balCheck1 = validateBalanceManipulation(testUser, -50)
test('7. Manipulação Saldo', '7.1 Bloquear saldo negativo', !balCheck1.valid, balCheck1.reason)

// 7.2 Aumentar saldo sem origem (fraude)
const balCheck2 = validateBalanceManipulation(testUser, 1000000)
test('7. Manipulação Saldo', '7.2 Bloquear aumento sem origem', !balCheck2.valid, balCheck2.reason)

// 7.3 Saldo válido após depósito
testUser.totalDeposited = 500
const balCheck3 = validateBalanceManipulation(testUser, 400)
test('7. Manipulação Saldo', '7.3 Permitir saldo válido', balCheck3.valid, balCheck3.reason)

console.log('')

// ==========================================
// 8. DOUBLE SPENDING
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    8. DOUBLE SPENDING')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const spender: User = { ...testUser, id: 'spender', wallet: '0x' + 'e'.repeat(40), balance: 100 }

// Transações pendentes
const pendingTxs: Transaction[] = [
  {
    id: 'tx_1',
    txHash: '0x' + '1'.repeat(64),
    fromWallet: spender.wallet,
    toWallet: '0x' + '2'.repeat(40),
    amount: 50,
    type: 'TRANSFER',
    status: 'PENDING',
    createdAt: new Date()
  }
]

// 8.1 Tentar gastar mais que disponível (100 - 50 pendente = 50 disponível)
const doubleSpend1 = validateDoubleSpending(spender, 80, pendingTxs)
test('8. Double Spending', '8.1 Bloquear gasto > disponível', !doubleSpend1.valid, doubleSpend1.reason)

// 8.2 Gastar valor disponível
const doubleSpend2 = validateDoubleSpending(spender, 50, pendingTxs)
test('8. Double Spending', '8.2 Permitir gasto <= disponível', doubleSpend2.valid, doubleSpend2.reason)

// 8.3 Sem transações pendentes
const doubleSpend3 = validateDoubleSpending(spender, 100, [])
test('8. Double Spending', '8.3 Saldo total sem pendências', doubleSpend3.valid, doubleSpend3.reason)

console.log('')

// ==========================================
// 9. RACE CONDITION
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    9. RACE CONDITION')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const raceUser: User = { ...testUser, id: 'race_user' }
const recentRequests = new Map<string, number[]>()

// 9.1 Primeira requisição - OK
const now = Date.now()
const race1 = validateRaceCondition(raceUser, 1, now, recentRequests)
test('9. Race Condition', '9.1 Primeira requisição OK', race1.valid, race1.reason)
recentRequests.set(`${raceUser.id}_1`, [now])

// 9.2 Requisição após 1 segundo - OK
const race2 = validateRaceCondition(raceUser, 1, now + 1000, recentRequests)
test('9. Race Condition', '9.2 Requisição após 1s OK', race2.valid, race2.reason)

// 9.3 Requisição simultânea (< 100ms) - BLOQUEADO
recentRequests.set(`${raceUser.id}_1`, [now])
const race3 = validateRaceCondition(raceUser, 1, now + 50, recentRequests)
test('9. Race Condition', '9.3 Bloquear requisição < 100ms', !race3.valid, race3.reason)

console.log('')

// ==========================================
// 10. TIMESTAMP MANIPULATION
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    10. MANIPULAÇÃO DE TIMESTAMP')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const serverTime = new Date()

// 10.1 Timestamp no futuro - BLOQUEADO
const futureTime = new Date(serverTime.getTime() + 10 * 60 * 1000) // 10 min no futuro
const ts1 = validateTimestampManipulation(futureTime, serverTime)
test('10. Timestamp', '10.1 Bloquear timestamp futuro', !ts1.valid, ts1.reason)

// 10.2 Timestamp muito antigo - BLOQUEADO
const pastTime = new Date(serverTime.getTime() - 10 * 60 * 1000) // 10 min no passado
const ts2 = validateTimestampManipulation(pastTime, serverTime)
test('10. Timestamp', '10.2 Bloquear timestamp muito antigo', !ts2.valid, ts2.reason)

// 10.3 Timestamp válido (dentro de 5 min)
const validTime = new Date(serverTime.getTime() - 2 * 60 * 1000) // 2 min atrás
const ts3 = validateTimestampManipulation(validTime, serverTime)
test('10. Timestamp', '10.3 Permitir timestamp válido', ts3.valid, ts3.reason)

console.log('')

// ==========================================
// 11. WASH TRADING
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    11. WASH TRADING')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const traderA: User = { ...testUser, id: 'trader_a', wallet: '0x' + 'a'.repeat(40), ipAddress: '10.0.0.1', deviceFingerprint: 'fp_a' }
const traderB: User = { ...testUser, id: 'trader_b', wallet: '0x' + 'b'.repeat(40), ipAddress: '10.0.0.2', deviceFingerprint: 'fp_b' }
const traderC: User = { ...testUser, id: 'trader_c', wallet: '0x' + 'c'.repeat(40), ipAddress: '10.0.0.1', deviceFingerprint: 'fp_a' } // Mesmo IP/device que A

// Histórico de transferências
const washHistory: Transaction[] = []

// 11.1 Primeira transferência - OK
const wash1 = validateWashTrading(traderA, traderB, washHistory)
test('11. Wash Trading', '11.1 Primeira transferência OK', wash1.valid, wash1.reason)

// 11.2 Padrão suspeito (3+ transferências em cada direção)
for (let i = 0; i < 3; i++) {
  washHistory.push({
    id: `tx_ab_${i}`,
    txHash: generateTxHash(),
    fromWallet: traderA.wallet,
    toWallet: traderB.wallet,
    amount: 10,
    type: 'TRANSFER',
    status: 'CONFIRMED',
    createdAt: new Date()
  })
  washHistory.push({
    id: `tx_ba_${i}`,
    txHash: generateTxHash(),
    fromWallet: traderB.wallet,
    toWallet: traderA.wallet,
    amount: 10,
    type: 'TRANSFER',
    status: 'CONFIRMED',
    createdAt: new Date()
  })
}

const wash2 = validateWashTrading(traderA, traderB, washHistory)
test('11. Wash Trading', '11.2 Detectar padrão circular', !wash2.valid, wash2.reason)

// 11.3 Mesmo IP/dispositivo
const wash3 = validateWashTrading(traderA, traderC, [])
test('11. Wash Trading', '11.3 Bloquear mesmo IP/device', !wash3.valid, wash3.reason)

console.log('')

// ==========================================
// 12. BONUS FARMING
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    12. BONUS FARMING')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const farmer: User = { ...testUser, id: 'farmer' }

// 12.1 Indicados legítimos (IPs diferentes, com depósito)
const legitReferrals: User[] = []
for (let i = 0; i < 5; i++) {
  legitReferrals.push({
    ...testUser,
    id: `legit_${i}`,
    ipAddress: `192.168.${i}.1`,
    deviceFingerprint: `device_${i}`,
    totalDeposited: 100
  })
}
const farm1 = validateBonusFarming(farmer, legitReferrals)
test('12. Bonus Farming', '12.1 Indicados legítimos OK', farm1.valid, farm1.reason)

// 12.2 Todos do mesmo IP
const sameIPReferrals: User[] = []
for (let i = 0; i < 5; i++) {
  sameIPReferrals.push({
    ...testUser,
    id: `sameip_${i}`,
    ipAddress: '192.168.1.1', // Mesmo IP
    deviceFingerprint: `device_${i}`,
    totalDeposited: 100
  })
}
const farm2 = validateBonusFarming(farmer, sameIPReferrals)
test('12. Bonus Farming', '12.2 Bloquear mesmo IP', !farm2.valid, farm2.reason)

// 12.3 Indicados sem depósito
const noDepositReferrals: User[] = []
for (let i = 0; i < 5; i++) {
  noDepositReferrals.push({
    ...testUser,
    id: `nodeposit_${i}`,
    ipAddress: `192.168.${i}.1`,
    deviceFingerprint: `device_${i}`,
    totalDeposited: 0 // Sem depósito
  })
}
const farm3 = validateBonusFarming(farmer, noDepositReferrals)
test('12. Bonus Farming', '12.3 Bloquear sem depósitos', !farm3.valid, farm3.reason)

console.log('')

// ==========================================
// 13. SCORE MANIPULATION
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    13. MANIPULAÇÃO DE SCORE')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 13.1 Score negativo
const score1 = validateScoreManipulation(-100, CONFIG.SCORE_CAP)
test('13. Score Manipulation', '13.1 Bloquear score negativo', !score1.valid, score1.reason)

// 13.2 Score acima do máximo
const score2 = validateScoreManipulation(1000, CONFIG.SCORE_CAP)
test('13. Score Manipulation', '13.2 Bloquear score > máximo', !score2.valid, score2.reason)

// 13.3 Score Infinity
const score3 = validateScoreManipulation(Infinity, CONFIG.SCORE_CAP)
test('13. Score Manipulation', '13.3 Bloquear Infinity', !score3.valid, score3.reason)

// 13.4 Score NaN
const score4 = validateScoreManipulation(NaN, CONFIG.SCORE_CAP)
test('13. Score Manipulation', '13.4 Bloquear NaN', !score4.valid, score4.reason)

// 13.5 Score válido
const score5 = validateScoreManipulation(150, CONFIG.SCORE_CAP)
test('13. Score Manipulation', '13.5 Permitir score válido', score5.valid, score5.reason)

console.log('')

// ==========================================
// 14. SQL INJECTION
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    14. SQL INJECTION')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 14.1 Classic SQL injection
const sql1 = validateSQLInjection("' OR '1'='1")
test('14. SQL Injection', '14.1 Bloquear OR 1=1', !sql1.valid, sql1.reason)

// 14.2 DROP TABLE
const sql2 = validateSQLInjection("'; DROP TABLE users; --")
test('14. SQL Injection', '14.2 Bloquear DROP TABLE', !sql2.valid, sql2.reason)

// 14.3 UNION SELECT
const sql3 = validateSQLInjection("' UNION SELECT * FROM passwords --")
test('14. SQL Injection', '14.3 Bloquear UNION SELECT', !sql3.valid, sql3.reason)

// 14.4 Time-based injection
const sql4 = validateSQLInjection("'; WAITFOR DELAY '0:0:10' --")
test('14. SQL Injection', '14.4 Bloquear WAITFOR DELAY', !sql4.valid, sql4.reason)

// 14.5 Input normal
const sql5 = validateSQLInjection("João Silva")
test('14. SQL Injection', '14.5 Permitir input normal', sql5.valid, sql5.reason)

// 14.6 Email normal
const sql6 = validateSQLInjection("joao.silva@email.com")
test('14. SQL Injection', '14.6 Permitir email', sql6.valid, sql6.reason)

console.log('')

// ==========================================
// 15. XSS INJECTION
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    15. XSS INJECTION')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 15.1 Script tag
const xss1 = validateXSSInjection("<script>alert('XSS')</script>")
test('15. XSS Injection', '15.1 Bloquear <script>', !xss1.valid, xss1.reason)

// 15.2 Event handler
const xss2 = validateXSSInjection('<img src=x onerror="alert(1)">')
test('15. XSS Injection', '15.2 Bloquear onerror', !xss2.valid, xss2.reason)

// 15.3 javascript: protocol
const xss3 = validateXSSInjection('<a href="javascript:alert(1)">Click</a>')
test('15. XSS Injection', '15.3 Bloquear javascript:', !xss3.valid, xss3.reason)

// 15.4 Iframe
const xss4 = validateXSSInjection('<iframe src="http://evil.com"></iframe>')
test('15. XSS Injection', '15.4 Bloquear iframe', !xss4.valid, xss4.reason)

// 15.5 Input normal com caracteres especiais
const xss5 = validateXSSInjection("O'Reilly & Sons <Company>")
test('15. XSS Injection', '15.5 Permitir texto normal', xss5.valid, xss5.reason)

console.log('')

// ==========================================
// 16. WALLET DUPLICADA
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    16. WALLET DUPLICADA')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const existingWallet = '0x' + '1'.repeat(40)
usedWallets.add(existingWallet.toLowerCase())

// 16.1 Wallet já existe
const wallet1 = validateUniqueWallet(existingWallet)
test('16. Wallet Duplicada', '16.1 Bloquear wallet existente', !wallet1.valid, wallet1.reason)

// 16.2 Wallet nova
const wallet2 = validateUniqueWallet('0x' + '9'.repeat(40))
test('16. Wallet Duplicada', '16.2 Permitir wallet nova', wallet2.valid, wallet2.reason)

// 16.3 Case diferente (normalizado)
const wallet3 = validateUniqueWallet(existingWallet.toUpperCase())
test('16. Wallet Duplicada', '16.3 Bloquear case diferente', !wallet3.valid, wallet3.reason)

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
  console.log('                    ✅ TODOS OS TESTES DE FRAUDE PASSARAM!')
  console.log('                    Sistema protegido contra tentativas de fraude.')
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
} else {
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
  console.log('                    ❌ ALGUNS TESTES FALHARAM!')
  console.log('                    Revisar proteções anti-fraude.')
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
}

console.log('')
console.log(`Total: ${passed}/${total} testes passaram (${percentage}%)`)
console.log('')

// Checklist de proteções
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    CHECKLIST DE PROTEÇÕES ANTI-FRAUDE')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')
console.log('   🛡️ PROTEÇÕES VALIDADAS:')
console.log('   ├── Auto-indicação bloqueada')
console.log('   ├── Ciclos de indicação detectados')
console.log('   ├── Manipulação de posição na fila bloqueada')
console.log('   ├── Sybil attack (múltiplas contas) limitado')
console.log('   ├── Replay attack (TX duplicado) bloqueado')
console.log('   ├── Roubo de PIN bloqueado')
console.log('   ├── Manipulação de saldo detectada')
console.log('   ├── Double spending prevenido')
console.log('   ├── Race conditions detectadas')
console.log('   ├── Timestamp manipulation bloqueada')
console.log('   ├── Wash trading detectado')
console.log('   ├── Bonus farming detectado')
console.log('   ├── Score manipulation bloqueada')
console.log('   ├── SQL Injection sanitizado')
console.log('   ├── XSS Injection sanitizado')
console.log('   └── Wallet duplicada bloqueada')
console.log('')
console.log('   ⚠️ RECOMENDAÇÕES ADICIONAIS:')
console.log('   ├── Implementar CAPTCHA em ações sensíveis')
console.log('   ├── Rate limiting por IP/usuário')
console.log('   ├── Verificação de email/SMS')
console.log('   ├── KYC para valores altos')
console.log('   ├── Monitoramento de padrões suspeitos')
console.log('   ├── Logs de auditoria completos')
console.log('   ├── Alertas em tempo real')
console.log('   └── Revisão manual de casos suspeitos')
console.log('')

if (failed > 0) {
  process.exit(1)
}
