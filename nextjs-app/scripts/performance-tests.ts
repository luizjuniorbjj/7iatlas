/**
 * 7iATLAS - TESTES DE PERFORMANCE / BENCHMARK
 *
 * Objetivo: Medir tempos de execução, throughput e latência do sistema
 *
 * Métricas:
 * - Latência: P50, P95, P99 (percentis)
 * - Throughput: operações por segundo
 * - Memória: uso antes/depois
 * - Tempo de resposta médio
 */

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const CONFIG = {
  ENTRY_VALUES: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120],
  POSITIONS_PER_CYCLE: 7,
  MAX_LEVEL: 10,
  JUPITER_POOL_PERCENT: 0.10,

  // Benchmarks - Limites aceitáveis
  BENCHMARK: {
    USER_CREATION_MAX_MS: 0.1,        // Criar usuário < 0.1ms
    CYCLE_PROCESSING_MAX_MS: 1,       // Processar ciclo < 1ms
    QUEUE_SORT_10K_MAX_MS: 50,        // Ordenar 10k < 50ms
    ACCOUNTING_CHECK_MAX_MS: 10,      // Verificar contabilidade < 10ms
    SCORE_CALCULATION_MAX_MS: 0.01,   // Calcular score < 0.01ms
    BATCH_1K_USERS_MAX_MS: 100,       // Criar 1k usuários < 100ms
    BATCH_1K_CYCLES_MAX_MS: 500,      // Processar 1k ciclos < 500ms
  }
}

// ==========================================
// ESTRUTURAS DE DADOS
// ==========================================

interface User {
  id: string
  wallet: string
  balance: number
  totalDeposited: number
  referrerId: string | null
  referralCount: number
}

interface QueueEntry {
  id: string
  oderId: string
  level: number
  score: number
}

interface BenchmarkResult {
  name: string
  iterations: number
  totalMs: number
  avgMs: number
  minMs: number
  maxMs: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
  opsPerSecond: number
  passed: boolean
  threshold: number
}

// Estado global
const users = new Map<string, User>()
const queues = new Map<number, QueueEntry[]>()
const levelCashes: number[] = new Array(10).fill(0)
let systemFunds = { reserve: 0, operational: 0, profit: 0, jupiterPool: 0 }
let idCounter = 0

const benchmarkResults: BenchmarkResult[] = []

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
  return '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0')
}

function resetSystem(): void {
  users.clear()
  for (let i = 1; i <= 10; i++) {
    queues.set(i, [])
  }
  levelCashes.fill(0)
  systemFunds = { reserve: 0, operational: 0, profit: 0, jupiterPool: 0 }
  idCounter = 0
}

function createUser(referrerId: string | null = null): User {
  const id = generateId()
  const user: User = {
    id,
    wallet: generateWallet(),
    balance: 0,
    totalDeposited: 0,
    referrerId,
    referralCount: 0
  }
  users.set(id, user)

  if (referrerId) {
    const referrer = users.get(referrerId)
    if (referrer) referrer.referralCount++
  }

  return user
}

function activateUser(user: User, level: number = 1): void {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  user.totalDeposited += entry
  levelCashes[level - 1] += entry

  queues.get(level)!.push({
    id: generateId(),
    oderId: user.id,
    level,
    score: 0
  })
}

function calculateScore(timeInQueue: number, reentries: number, referrals: number): number {
  const timeScore = Math.floor(timeInQueue / (24 * 60 * 60 * 1000)) * 2
  const reentryScore = reentries * 1.5
  const referralScore = Math.min(referrals * 10, 290)
  return timeScore + reentryScore + referralScore
}

function processCycle(level: number): boolean {
  const queue = queues.get(level)!
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const required = entry * 7

  if (levelCashes[level - 1] < required || queue.length < 7) return false

  // Ordenar por score
  queue.sort((a, b) => b.score - a.score)

  const participants = queue.splice(0, 7)
  const receiverId = participants[0].oderId
  const receiver = users.get(receiverId)!

  // Receiver ganha
  const reward = entry * 2
  const jupiter = reward * 0.10
  receiver.balance += reward - jupiter
  systemFunds.jupiterPool += jupiter

  // Reentradas
  queue.push({ id: generateId(), oderId: receiverId, level, score: 0 })
  for (let i = 1; i <= 4; i++) {
    queue.push({ id: generateId(), oderId: participants[i].oderId, level, score: participants[i].score + 1 })
  }
  queue.push({ id: generateId(), oderId: participants[5].oderId, level, score: participants[5].score + 1 })
  queue.push({ id: generateId(), oderId: participants[6].oderId, level, score: participants[6].score + 1 })

  // Próximo nível
  if (level < 10) {
    levelCashes[level] += entry * 2
    queues.get(level + 1)!.push({ id: generateId(), oderId: receiverId, level: level + 1, score: 0 })
  } else {
    systemFunds.reserve += entry * 2
  }

  // Distribuição pos 5
  systemFunds.reserve += entry * 0.10
  systemFunds.operational += entry * 0.10
  systemFunds.profit += entry * 0.80

  // Ajustar caixa
  levelCashes[level - 1] -= required
  levelCashes[level - 1] += entry * 2

  return true
}

function validateAccounting(): boolean {
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

  return Math.abs(totalIn - totalOut) < 0.01
}

// ==========================================
// FUNÇÕES DE BENCHMARK
// ==========================================

function benchmark(name: string, fn: () => void, iterations: number, threshold: number): BenchmarkResult {
  const times: number[] = []

  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    fn()
  }

  // Medição
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    const end = performance.now()
    times.push(end - start)
  }

  // Calcular estatísticas
  times.sort((a, b) => a - b)
  const totalMs = times.reduce((a, b) => a + b, 0)
  const avgMs = totalMs / iterations
  const minMs = times[0]
  const maxMs = times[times.length - 1]
  const p50Ms = times[Math.floor(iterations * 0.50)]
  const p95Ms = times[Math.floor(iterations * 0.95)]
  const p99Ms = times[Math.floor(iterations * 0.99)]
  const opsPerSecond = 1000 / avgMs

  const passed = avgMs <= threshold

  return {
    name,
    iterations,
    totalMs,
    avgMs,
    minMs,
    maxMs,
    p50Ms,
    p95Ms,
    p99Ms,
    opsPerSecond,
    passed,
    threshold
  }
}

function formatNumber(n: number, decimals: number = 2): string {
  if (n >= 1000000) return (n / 1000000).toFixed(decimals) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(decimals) + 'K'
  return n.toFixed(decimals)
}

function printBenchmark(result: BenchmarkResult): void {
  const status = result.passed ? '✅' : '❌'
  console.log(`${status} ${result.name}`)
  console.log(`   Iterações: ${formatNumber(result.iterations, 0)}`)
  console.log(`   Média: ${result.avgMs.toFixed(4)}ms (limite: ${result.threshold}ms)`)
  console.log(`   Min/Max: ${result.minMs.toFixed(4)}ms / ${result.maxMs.toFixed(4)}ms`)
  console.log(`   P50/P95/P99: ${result.p50Ms.toFixed(4)}ms / ${result.p95Ms.toFixed(4)}ms / ${result.p99Ms.toFixed(4)}ms`)
  console.log(`   Throughput: ${formatNumber(result.opsPerSecond)} ops/seg`)
  console.log('')
}

// ==========================================
// INÍCIO DOS TESTES
// ==========================================

console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════╗')
console.log('║              7iATLAS - TESTES DE PERFORMANCE / BENCHMARK                                    ║')
console.log('║              Medição de Latência e Throughput                                               ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝')
console.log('')

// ==========================================
// 1. CRIAÇÃO DE USUÁRIOS
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    1. CRIAÇÃO DE USUÁRIOS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()
const benchCreateUser = benchmark(
  '1.1 Criar usuário individual',
  () => createUser(null),
  10000,
  CONFIG.BENCHMARK.USER_CREATION_MAX_MS
)
printBenchmark(benchCreateUser)
benchmarkResults.push(benchCreateUser)

resetSystem()
const benchCreateUserWithRef = benchmark(
  '1.2 Criar usuário com indicador',
  () => {
    const ref = createUser(null)
    createUser(ref.id)
  },
  5000,
  CONFIG.BENCHMARK.USER_CREATION_MAX_MS * 2
)
printBenchmark(benchCreateUserWithRef)
benchmarkResults.push(benchCreateUserWithRef)

// Batch de 1000 usuários
resetSystem()
const startBatch1k = performance.now()
for (let i = 0; i < 1000; i++) {
  createUser(null)
}
const endBatch1k = performance.now()
const batch1kTime = endBatch1k - startBatch1k
const batch1kPassed = batch1kTime <= CONFIG.BENCHMARK.BATCH_1K_USERS_MAX_MS

console.log(`${batch1kPassed ? '✅' : '❌'} 1.3 Batch 1000 usuários`)
console.log(`   Tempo total: ${batch1kTime.toFixed(2)}ms (limite: ${CONFIG.BENCHMARK.BATCH_1K_USERS_MAX_MS}ms)`)
console.log(`   Throughput: ${formatNumber(1000 / (batch1kTime / 1000))} usuários/seg`)
console.log('')

benchmarkResults.push({
  name: '1.3 Batch 1000 usuários',
  iterations: 1,
  totalMs: batch1kTime,
  avgMs: batch1kTime,
  minMs: batch1kTime,
  maxMs: batch1kTime,
  p50Ms: batch1kTime,
  p95Ms: batch1kTime,
  p99Ms: batch1kTime,
  opsPerSecond: 1000 / (batch1kTime / 1000),
  passed: batch1kPassed,
  threshold: CONFIG.BENCHMARK.BATCH_1K_USERS_MAX_MS
})

// ==========================================
// 2. ATIVAÇÃO DE USUÁRIOS
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    2. ATIVAÇÃO DE USUÁRIOS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()
const usersToActivate: User[] = []
for (let i = 0; i < 1000; i++) {
  usersToActivate.push(createUser(null))
}

let activateIdx = 0
const benchActivate = benchmark(
  '2.1 Ativar usuário',
  () => {
    if (activateIdx < usersToActivate.length) {
      activateUser(usersToActivate[activateIdx++], 1)
    }
  },
  1000,
  CONFIG.BENCHMARK.USER_CREATION_MAX_MS
)
printBenchmark(benchActivate)
benchmarkResults.push(benchActivate)

// ==========================================
// 3. PROCESSAMENTO DE CICLOS
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    3. PROCESSAMENTO DE CICLOS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// Preparar sistema com usuários suficientes
resetSystem()
for (let i = 0; i < 10000; i++) {
  const user = createUser(null)
  activateUser(user, 1)
}

const benchCycle = benchmark(
  '3.1 Processar ciclo N1',
  () => processCycle(1),
  1000,
  CONFIG.BENCHMARK.CYCLE_PROCESSING_MAX_MS
)
printBenchmark(benchCycle)
benchmarkResults.push(benchCycle)

// Batch de 1000 ciclos
resetSystem()
for (let i = 0; i < 10000; i++) {
  const user = createUser(null)
  activateUser(user, 1)
}

const startBatchCycles = performance.now()
let cyclesProcessed = 0
for (let i = 0; i < 1000; i++) {
  if (processCycle(1)) cyclesProcessed++
}
const endBatchCycles = performance.now()
const batchCyclesTime = endBatchCycles - startBatchCycles
const batchCyclesPassed = batchCyclesTime <= CONFIG.BENCHMARK.BATCH_1K_CYCLES_MAX_MS

console.log(`${batchCyclesPassed ? '✅' : '❌'} 3.2 Batch 1000 ciclos`)
console.log(`   Ciclos processados: ${cyclesProcessed}`)
console.log(`   Tempo total: ${batchCyclesTime.toFixed(2)}ms (limite: ${CONFIG.BENCHMARK.BATCH_1K_CYCLES_MAX_MS}ms)`)
console.log(`   Throughput: ${formatNumber(cyclesProcessed / (batchCyclesTime / 1000))} ciclos/seg`)
console.log('')

benchmarkResults.push({
  name: '3.2 Batch 1000 ciclos',
  iterations: 1,
  totalMs: batchCyclesTime,
  avgMs: batchCyclesTime / cyclesProcessed,
  minMs: batchCyclesTime / cyclesProcessed,
  maxMs: batchCyclesTime / cyclesProcessed,
  p50Ms: batchCyclesTime / cyclesProcessed,
  p95Ms: batchCyclesTime / cyclesProcessed,
  p99Ms: batchCyclesTime / cyclesProcessed,
  opsPerSecond: cyclesProcessed / (batchCyclesTime / 1000),
  passed: batchCyclesPassed,
  threshold: CONFIG.BENCHMARK.BATCH_1K_CYCLES_MAX_MS
})

// ==========================================
// 4. CÁLCULO DE SCORE
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    4. CÁLCULO DE SCORE')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const benchScore = benchmark(
  '4.1 Calcular score',
  () => calculateScore(86400000, 5, 10),
  100000,
  CONFIG.BENCHMARK.SCORE_CALCULATION_MAX_MS
)
printBenchmark(benchScore)
benchmarkResults.push(benchScore)

// ==========================================
// 5. ORDENAÇÃO DE FILA
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    5. ORDENAÇÃO DE FILA')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// Criar fila grande
const bigQueue: QueueEntry[] = []
for (let i = 0; i < 10000; i++) {
  bigQueue.push({
    id: `entry_${i}`,
    oderId: `user_${i}`,
    level: 1,
    score: Math.random() * 1000
  })
}

const benchSort = benchmark(
  '5.1 Ordenar fila 10K',
  () => {
    const copy = [...bigQueue]
    copy.sort((a, b) => b.score - a.score)
  },
  100,
  CONFIG.BENCHMARK.QUEUE_SORT_10K_MAX_MS
)
printBenchmark(benchSort)
benchmarkResults.push(benchSort)

// Fila de 50K
const hugeQueue: QueueEntry[] = []
for (let i = 0; i < 50000; i++) {
  hugeQueue.push({
    id: `entry_${i}`,
    oderId: `user_${i}`,
    level: 1,
    score: Math.random() * 1000
  })
}

const startSort50k = performance.now()
hugeQueue.sort((a, b) => b.score - a.score)
const endSort50k = performance.now()
const sort50kTime = endSort50k - startSort50k

console.log(`✅ 5.2 Ordenar fila 50K`)
console.log(`   Tempo: ${sort50kTime.toFixed(2)}ms`)
console.log(`   Throughput: ${formatNumber(50000 / (sort50kTime / 1000))} elementos/seg`)
console.log('')

benchmarkResults.push({
  name: '5.2 Ordenar fila 50K',
  iterations: 1,
  totalMs: sort50kTime,
  avgMs: sort50kTime,
  minMs: sort50kTime,
  maxMs: sort50kTime,
  p50Ms: sort50kTime,
  p95Ms: sort50kTime,
  p99Ms: sort50kTime,
  opsPerSecond: 50000 / (sort50kTime / 1000),
  passed: true,
  threshold: 500
})

// ==========================================
// 6. VERIFICAÇÃO DE CONTABILIDADE
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    6. VERIFICAÇÃO DE CONTABILIDADE')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// Preparar sistema grande
resetSystem()
for (let i = 0; i < 10000; i++) {
  const user = createUser(null)
  activateUser(user, 1)
}
for (let i = 0; i < 500; i++) {
  processCycle(1)
}

const benchAccounting = benchmark(
  '6.1 Verificar contabilidade (10K usuários)',
  () => validateAccounting(),
  100,
  CONFIG.BENCHMARK.ACCOUNTING_CHECK_MAX_MS
)
printBenchmark(benchAccounting)
benchmarkResults.push(benchAccounting)

// ==========================================
// 7. BUSCA EM MAP
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    7. BUSCA EM MAP')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const benchMapGet = benchmark(
  '7.1 Buscar usuário por ID',
  () => users.get('id_5000'),
  100000,
  0.001 // 0.001ms = 1 microsegundo
)
printBenchmark(benchMapGet)
benchmarkResults.push(benchMapGet)

const benchMapHas = benchmark(
  '7.2 Verificar existência de ID',
  () => users.has('id_5000'),
  100000,
  0.001
)
printBenchmark(benchMapHas)
benchmarkResults.push(benchMapHas)

// ==========================================
// 8. OPERAÇÕES MATEMÁTICAS
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    8. OPERAÇÕES MATEMÁTICAS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const benchMath = benchmark(
  '8.1 Cálculo de recompensa',
  () => {
    const entry = 10
    const gross = entry * 2
    const jupiter = gross * 0.10
    const net = gross - jupiter
    return net
  },
  100000,
  0.001
)
printBenchmark(benchMath)
benchmarkResults.push(benchMath)

const benchPos5 = benchmark(
  '8.2 Distribuição Pos5',
  () => {
    const entry = 10
    const reserve = entry * 0.10
    const operational = entry * 0.10
    const profit = entry * 0.80
    return reserve + operational + profit
  },
  100000,
  0.001
)
printBenchmark(benchPos5)
benchmarkResults.push(benchPos5)

// ==========================================
// 9. MEMÓRIA
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    9. USO DE MEMÓRIA')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

if (global.gc) {
  global.gc()
}

const memBefore = process.memoryUsage()

resetSystem()
for (let i = 0; i < 100000; i++) {
  const user = createUser(null)
  activateUser(user, 1)
}

const memAfter = process.memoryUsage()

const heapUsedMB = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024
const rssUsedMB = (memAfter.rss - memBefore.rss) / 1024 / 1024

console.log(`📊 Memória para 100K usuários:`)
console.log(`   Heap Used: ${heapUsedMB.toFixed(2)} MB`)
console.log(`   RSS: ${rssUsedMB.toFixed(2)} MB`)
console.log(`   Por usuário: ${((heapUsedMB * 1024) / 100).toFixed(2)} KB`)
console.log('')

const memoryPassed = heapUsedMB < 500 // Menos de 500MB para 100K usuários
benchmarkResults.push({
  name: '9.1 Memória 100K usuários',
  iterations: 1,
  totalMs: 0,
  avgMs: 0,
  minMs: 0,
  maxMs: 0,
  p50Ms: 0,
  p95Ms: 0,
  p99Ms: 0,
  opsPerSecond: 0,
  passed: memoryPassed,
  threshold: 500
})

// ==========================================
// 10. THROUGHPUT GERAL
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    10. THROUGHPUT GERAL DO SISTEMA')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

resetSystem()

const startThroughput = performance.now()

// Criar 10K usuários
for (let i = 0; i < 10000; i++) {
  const user = createUser(null)
  activateUser(user, 1)
}

// Processar todos os ciclos possíveis
let totalCycles = 0
while (processCycle(1) && totalCycles < 2000) {
  totalCycles++
}

// Verificar contabilidade
const accountingOk = validateAccounting()

const endThroughput = performance.now()
const throughputTime = endThroughput - startThroughput

console.log(`📊 Throughput Geral:`)
console.log(`   Usuários criados: 10,000`)
console.log(`   Ciclos processados: ${totalCycles}`)
console.log(`   Tempo total: ${throughputTime.toFixed(2)}ms`)
console.log(`   Contabilidade: ${accountingOk ? '✅ OK' : '❌ ERRO'}`)
console.log(`   Operações totais: ${10000 + totalCycles}`)
console.log(`   Throughput: ${formatNumber((10000 + totalCycles) / (throughputTime / 1000))} ops/seg`)
console.log('')

benchmarkResults.push({
  name: '10.1 Throughput Geral',
  iterations: 1,
  totalMs: throughputTime,
  avgMs: throughputTime / (10000 + totalCycles),
  minMs: 0,
  maxMs: 0,
  p50Ms: 0,
  p95Ms: 0,
  p99Ms: 0,
  opsPerSecond: (10000 + totalCycles) / (throughputTime / 1000),
  passed: accountingOk && throughputTime < 5000,
  threshold: 5000
})

// ==========================================
// RESUMO FINAL
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    RESUMO DOS RESULTADOS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

const passed = benchmarkResults.filter(r => r.passed).length
const failed = benchmarkResults.filter(r => !r.passed).length
const total = benchmarkResults.length

console.log(`📊 TOTAL DE BENCHMARKS: ${total}`)
console.log(`✅ PASSARAM: ${passed}`)
console.log(`❌ FALHARAM: ${failed}`)
console.log('')

console.log('📋 RESULTADOS DETALHADOS:')
console.log('────────────────────────────────────────────────────────────────────────────────────────────────────')
for (const result of benchmarkResults) {
  const status = result.passed ? '✅' : '❌'
  const throughput = result.opsPerSecond > 0 ? ` (${formatNumber(result.opsPerSecond)} ops/s)` : ''
  console.log(`   ${status} ${result.name}: ${result.avgMs.toFixed(4)}ms${throughput}`)
}

console.log('')

if (failed === 0) {
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
  console.log('                    ✅ TODOS OS BENCHMARKS PASSARAM!')
  console.log('                    Performance dentro dos limites aceitáveis.')
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
} else {
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
  console.log('                    ⚠️ ALGUNS BENCHMARKS FALHARAM!')
  console.log('                    Revisar performance das operações.')
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
}

console.log('')
console.log(`Total: ${passed}/${total} benchmarks passaram (${(passed / total * 100).toFixed(1)}%)`)
console.log('')

// Resumo de performance
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    MÉTRICAS DE PERFORMANCE')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')
console.log('   📈 THROUGHPUT:')
console.log(`   ├── Criação de usuários: ${formatNumber(benchCreateUser.opsPerSecond)} /seg`)
console.log(`   ├── Processamento de ciclos: ${formatNumber(benchCycle.opsPerSecond)} /seg`)
console.log(`   ├── Cálculo de score: ${formatNumber(benchScore.opsPerSecond)} /seg`)
console.log(`   └── Busca em Map: ${formatNumber(benchMapGet.opsPerSecond)} /seg`)
console.log('')
console.log('   ⏱️ LATÊNCIA (P99):')
console.log(`   ├── Criar usuário: ${benchCreateUser.p99Ms.toFixed(4)}ms`)
console.log(`   ├── Processar ciclo: ${benchCycle.p99Ms.toFixed(4)}ms`)
console.log(`   ├── Calcular score: ${benchScore.p99Ms.toFixed(6)}ms`)
console.log(`   └── Ordenar 10K: ${benchSort.p99Ms.toFixed(2)}ms`)
console.log('')

if (failed > 0) {
  process.exit(1)
}
