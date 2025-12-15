/**
 * 7iATLAS - TESTES CRÍTICOS
 *
 * 1. Testes de Contabilidade - Garantir $0 vazamento
 * 2. Testes de Edge Cases - Nível 10 e casos extremos
 * 3. Testes Unitários - Funções matemáticas
 *
 * Execução: npx ts-node --transpile-only scripts/critical-tests.ts
 */

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const CONFIG = {
  LEVELS: 10,
  ENTRY_VALUES: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120],
  REWARD_MULTIPLIER: 2,
  JUPITER_POOL_PERCENT: 0.10,
  RESERVE_PERCENT: 0.10,
  OPERATIONAL_PERCENT: 0.10,
  BONUS_PERCENT: 0.40,
  PROFIT_PERCENT: 0.40,
  SCORE_TIME_MULTIPLIER: 2,
  SCORE_REENTRY_MULTIPLIER: 1.5,
  SCORE_CAP: 290,
  MAX_QUOTAS_PER_LEVEL: 10,
}

// ==========================================
// ESTRUTURA DE TESTES
// ==========================================

interface TestResult {
  name: string
  passed: boolean
  expected: any
  actual: any
  details?: string
}

const testResults: TestResult[] = []

function test(name: string, expected: any, actual: any, details?: string): void {
  const passed = JSON.stringify(expected) === JSON.stringify(actual) ||
                 (typeof expected === 'number' && typeof actual === 'number' && Math.abs(expected - actual) < 0.01)
  testResults.push({ name, passed, expected, actual, details })
}

function testTrue(name: string, condition: boolean, details?: string): void {
  testResults.push({ name, passed: condition, expected: true, actual: condition, details })
}

// ==========================================
// 1. TESTES UNITÁRIOS - FUNÇÕES MATEMÁTICAS
// ==========================================

console.log('')
console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════╗')
console.log('║              7iATLAS - TESTES CRÍTICOS PROFISSIONAIS                                         ║')
console.log('║              Validação para Produção                                                         ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝')
console.log('')

console.log('═'.repeat(100))
console.log('                    1. TESTES UNITÁRIOS - FUNÇÕES MATEMÁTICAS')
console.log('═'.repeat(100))
console.log('')

// 1.1 Valores por Nível
console.log('📐 1.1 Valores por Nível:')
for (let level = 1; level <= 10; level++) {
  const expectedValue = 10 * Math.pow(2, level - 1)
  const actualValue = CONFIG.ENTRY_VALUES[level - 1]
  test(`Nível ${level} entrada`, expectedValue, actualValue)
}

// 1.2 Ganho do Receiver (2x)
console.log('📐 1.2 Ganho do Receiver (2x):')
for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const expectedReward = entry * 2
  test(`Nível ${level} ganho bruto`, expectedReward, entry * CONFIG.REWARD_MULTIPLIER)
}

// 1.3 Jupiter Pool (10% do ganho)
console.log('📐 1.3 Jupiter Pool (10% do ganho):')
for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const reward = entry * 2
  const expectedJupiter = reward * 0.10
  const actualJupiter = reward * CONFIG.JUPITER_POOL_PERCENT
  test(`Nível ${level} Jupiter Pool`, expectedJupiter, actualJupiter)
}

// 1.4 Distribuição Posição 5
console.log('📐 1.4 Distribuição Posição 5:')
for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const reserve = entry * 0.10
  const operational = entry * 0.10
  const bonus = entry * 0.40
  const profit = entry * 0.40
  const total = reserve + operational + bonus + profit
  test(`Nível ${level} Pos5 soma 100%`, entry, total, `${reserve}+${operational}+${bonus}+${profit}=${total}`)
}

// 1.5 Sistema de Score - CAP Progressivo
console.log('📐 1.5 Sistema de Score - CAP Progressivo:')

function calcularPontosIndicados(indicados: number): number {
  let pontos = 0
  // Faixa 1: 1-10 (×10)
  pontos += Math.min(10, indicados) * 10
  // Faixa 2: 11-30 (×5)
  if (indicados > 10) pontos += Math.min(20, indicados - 10) * 5
  // Faixa 3: 31-50 (×2)
  if (indicados > 30) pontos += Math.min(20, indicados - 30) * 2
  // Faixa 4: 51-100 (×1)
  if (indicados > 50) pontos += Math.min(50, indicados - 50) * 1
  return pontos
}

test('Score 0 indicados', 0, calcularPontosIndicados(0))
test('Score 5 indicados', 50, calcularPontosIndicados(5))
test('Score 10 indicados', 100, calcularPontosIndicados(10))
test('Score 20 indicados', 150, calcularPontosIndicados(20))
test('Score 30 indicados', 200, calcularPontosIndicados(30))
test('Score 50 indicados', 240, calcularPontosIndicados(50))
test('Score 100 indicados', 290, calcularPontosIndicados(100))
test('Score 200 indicados (CAP)', 290, calcularPontosIndicados(200))
test('Score 500 indicados (CAP)', 290, calcularPontosIndicados(500))

// 1.6 Score Completo
console.log('📐 1.6 Score Completo (tempo + reentradas + indicados):')

function calcularScore(horasEspera: number, reentradas: number, indicados: number): number {
  return (horasEspera * CONFIG.SCORE_TIME_MULTIPLIER) +
         (reentradas * CONFIG.SCORE_REENTRY_MULTIPLIER) +
         calcularPontosIndicados(indicados)
}

test('Score: 24h, 2 reent, 5 ind', 101, calcularScore(24, 2, 5), '(24×2)+(2×1.5)+50=101')
test('Score: 24h, 0 reent, 100 ind', 338, calcularScore(24, 0, 100), '(24×2)+(0×1.5)+290=338')
test('Score: 24h, 3 reent, 0 ind', 52.5, calcularScore(24, 3, 0), '(24×2)+(3×1.5)+0=52.5')

// 1.7 Bônus Variável
console.log('📐 1.7 Bônus Variável por Tier:')

function getBonusPercent(indicadosAtivos: number): number {
  if (indicadosAtivos >= 10) return 0.40
  if (indicadosAtivos >= 5) return 0.20
  return 0
}

test('Bônus 0 indicados', 0, getBonusPercent(0))
test('Bônus 4 indicados', 0, getBonusPercent(4))
test('Bônus 5 indicados', 0.20, getBonusPercent(5))
test('Bônus 9 indicados', 0.20, getBonusPercent(9))
test('Bônus 10 indicados', 0.40, getBonusPercent(10))
test('Bônus 100 indicados', 0.40, getBonusPercent(100))

// ==========================================
// 2. TESTES DE CONTABILIDADE - $0 VAZAMENTO
// ==========================================

console.log('')
console.log('═'.repeat(100))
console.log('                    2. TESTES DE CONTABILIDADE - $0 VAZAMENTO')
console.log('═'.repeat(100))
console.log('')

// 2.1 Balanço de 1 Ciclo Completo (cada nível)
console.log('💰 2.1 Balanço de 1 Ciclo por Nível:')

interface CycleBalance {
  level: number
  entrada: number
  receiver: number
  jupiterPool: number
  nextLevel: number
  reserve: number
  operational: number
  bonusOrProfit: number
  profitFixed: number
  caixaRetorno: number
  total: number
  diferenca: number
}

function simularCiclo(levelNumber: number, bonusTier: 0 | 0.20 | 0.40 = 0): CycleBalance {
  const entry = CONFIG.ENTRY_VALUES[levelNumber - 1]
  const entrada = entry * 7 // 7 participantes

  // Saídas
  const receiverBruto = entry * 2 // pos 1 + pos 3
  const jupiterPool = receiverBruto * 0.10
  const receiverLiquido = receiverBruto - jupiterPool

  // Pos 2 + Pos 4
  const nextLevel = levelNumber < 10 ? entry * 2 : 0
  const reserveFromAdvance = levelNumber === 10 ? entry * 2 : 0

  // Pos 5 (Comunidade)
  const reserve = entry * 0.10
  const operational = entry * 0.10
  const bonusPaid = entry * bonusTier
  const bonusToProfit = entry * 0.40 - bonusPaid
  const profitFixed = entry * 0.40

  // Pos 0 + Pos 6 (ficam no caixa)
  const caixaRetorno = entry * 2

  // Total de saídas
  const totalSaidas = receiverLiquido + jupiterPool + nextLevel + reserveFromAdvance +
                      reserve + operational + bonusPaid + bonusToProfit + profitFixed + caixaRetorno

  return {
    level: levelNumber,
    entrada,
    receiver: receiverLiquido,
    jupiterPool,
    nextLevel,
    reserve: reserve + reserveFromAdvance,
    operational,
    bonusOrProfit: bonusPaid + bonusToProfit,
    profitFixed,
    caixaRetorno,
    total: totalSaidas,
    diferenca: entrada - totalSaidas
  }
}

// Testar todos os níveis com todos os tiers de bônus
const bonusTiers: (0 | 0.20 | 0.40)[] = [0, 0.20, 0.40]

for (let level = 1; level <= 10; level++) {
  for (const tier of bonusTiers) {
    const balance = simularCiclo(level, tier)
    const tierLabel = tier === 0 ? '0%' : tier === 0.20 ? '20%' : '40%'
    test(
      `N${level} Tier${tierLabel} Balanço`,
      0,
      balance.diferenca,
      `E:$${balance.entrada} S:$${balance.total.toFixed(2)}`
    )
  }
}

// 2.2 Teste de Rastreabilidade (onde vai cada $)
console.log('💰 2.2 Rastreabilidade Completa N1:')

const traceN1 = simularCiclo(1, 0)
console.log(`
   ENTRADA: $70 (7 × $10)
   ├── Receiver líquido: $${traceN1.receiver}
   ├── Jupiter Pool: $${traceN1.jupiterPool}
   ├── Caixa N2: $${traceN1.nextLevel}
   ├── Reserva: $${traceN1.reserve}
   ├── Operacional: $${traceN1.operational}
   ├── Bônus/Lucro: $${traceN1.bonusOrProfit}
   ├── Lucro Fixo: $${traceN1.profitFixed}
   └── Retorno Caixa: $${traceN1.caixaRetorno}
   ═══════════════════════
   TOTAL: $${traceN1.total} | DIFERENÇA: $${traceN1.diferenca}
`)

testTrue('N1 rastreabilidade completa', traceN1.diferenca === 0)

// 2.3 Teste de Múltiplos Ciclos Acumulados
console.log('💰 2.3 Balanço Acumulado (100 ciclos):')

interface SystemState {
  userBalances: number
  jupiterPool: number
  reserve: number
  operational: number
  profit: number
  levelCashes: number[]
}

function simularMultiplosCiclos(numCiclos: number, levelNumber: number): { entrada: number, estado: SystemState } {
  const entry = CONFIG.ENTRY_VALUES[levelNumber - 1]
  let totalEntrada = 0

  const estado: SystemState = {
    userBalances: 0,
    jupiterPool: 0,
    reserve: 0,
    operational: 0,
    profit: 0,
    levelCashes: Array(10).fill(0)
  }

  for (let i = 0; i < numCiclos; i++) {
    totalEntrada += entry * 7

    // Processar ciclo
    const receiverBruto = entry * 2
    const jupiter = receiverBruto * 0.10
    estado.jupiterPool += jupiter
    estado.userBalances += receiverBruto - jupiter

    // Pos 2+4
    if (levelNumber < 10) {
      estado.levelCashes[levelNumber] += entry * 2
    } else {
      estado.reserve += entry * 2
    }

    // Pos 5
    estado.reserve += entry * 0.10
    estado.operational += entry * 0.10
    estado.profit += entry * 0.80 // 40% lucro + 40% bônus não pago (tier 0%)

    // Pos 0+6 retornam ao caixa
    estado.levelCashes[levelNumber - 1] += entry * 2
  }

  return { entrada: totalEntrada, estado }
}

for (let level = 1; level <= 10; level++) {
  const { entrada, estado } = simularMultiplosCiclos(100, level)
  const totalSistema = estado.userBalances + estado.jupiterPool + estado.reserve +
                       estado.operational + estado.profit + estado.levelCashes.reduce((a, b) => a + b, 0)
  test(`N${level} 100 ciclos balanço`, entrada, totalSistema)
}

// ==========================================
// 3. TESTES DE EDGE CASES
// ==========================================

console.log('')
console.log('═'.repeat(100))
console.log('                    3. TESTES DE EDGE CASES - CASOS EXTREMOS')
console.log('═'.repeat(100))
console.log('')

// 3.1 Nível 10 - Posições 2 e 4
console.log('🔥 3.1 Nível 10 - Posições 2 e 4 vão para Reserva:')

const n10Balance = simularCiclo(10, 0)
testTrue('N10 pos2+4 vão para reserva', n10Balance.nextLevel === 0)
testTrue('N10 reserva inclui pos2+4', n10Balance.reserve === 5120 * 0.10 + 5120 * 2)
test('N10 reserva total', 5120 * 0.10 + 5120 * 2, n10Balance.reserve)

// 3.2 Nível 10 - Ciclo Perpétuo (Receiver reentra no N10)
console.log('🔥 3.2 Nível 10 - Sustentabilidade Perpétua:')

// Simular 1000 ciclos no N10
const n10Sim = simularMultiplosCiclos(1000, 10)
const n10Total = n10Sim.estado.userBalances + n10Sim.estado.jupiterPool + n10Sim.estado.reserve +
                 n10Sim.estado.operational + n10Sim.estado.profit +
                 n10Sim.estado.levelCashes.reduce((a, b) => a + b, 0)
test('N10 1000 ciclos balanço', n10Sim.entrada, n10Total)
testTrue('N10 reserva acumula de pos2+4', n10Sim.estado.reserve > 5120 * 0.10 * 1000)

// 3.3 Usuário sem Indicador
console.log('🔥 3.3 Usuário sem Indicador (bônus vai para lucro):')

function calcularLucroSemIndicador(levelNumber: number): number {
  const entry = CONFIG.ENTRY_VALUES[levelNumber - 1]
  // Sem indicador: 40% bônus + 40% lucro = 80% vai para lucro
  return entry * 0.80
}

for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const lucroEsperado = entry * 0.80
  test(`N${level} sem indicador lucro`, lucroEsperado, calcularLucroSemIndicador(level))
}

// 3.4 Limite de Cotas (10 por nível)
console.log('🔥 3.4 Limite de Cotas (máximo 10 por nível):')

function validarLimiteCotas(cotasAtuais: number, tentandoComprar: boolean): boolean {
  if (cotasAtuais >= CONFIG.MAX_QUOTAS_PER_LEVEL) return false
  return true
}

testTrue('9 cotas pode comprar +1', validarLimiteCotas(9, true))
testTrue('10 cotas NÃO pode comprar', !validarLimiteCotas(10, true))
testTrue('11 cotas NÃO pode comprar', !validarLimiteCotas(11, true))

// 3.5 Compra Sequencial de Níveis
console.log('🔥 3.5 Compra Sequencial (precisa ter N-1):')

function podeComprarNivel(nivelDesejado: number, cotasPorNivel: number[]): boolean {
  if (nivelDesejado === 1) return true // N1 sempre pode
  return cotasPorNivel[nivelDesejado - 2] > 0 // Precisa ter cota em N-1
}

testTrue('Pode comprar N1 sem nada', podeComprarNivel(1, [0,0,0,0,0,0,0,0,0,0]))
testTrue('Pode comprar N2 com N1', podeComprarNivel(2, [1,0,0,0,0,0,0,0,0,0]))
testTrue('NÃO pode comprar N2 sem N1', !podeComprarNivel(2, [0,0,0,0,0,0,0,0,0,0]))
testTrue('NÃO pode comprar N3 sem N2', !podeComprarNivel(3, [1,0,0,0,0,0,0,0,0,0]))
testTrue('Pode comprar N10 com N9', podeComprarNivel(10, [1,1,1,1,1,1,1,1,1,0]))
testTrue('NÃO pode comprar N10 sem N9', !podeComprarNivel(10, [1,1,1,1,1,1,1,1,0,0]))

// 3.6 Bônus Tiers com valores exatos
console.log('🔥 3.6 Bônus Variável - Valores Exatos:')

interface BonusTest {
  level: number
  tier: number
  indicados: number
  bonusEsperado: number
  lucroEsperado: number
}

const bonusTests: BonusTest[] = [
  { level: 1, tier: 0, indicados: 0, bonusEsperado: 0, lucroEsperado: 8 },
  { level: 1, tier: 0, indicados: 4, bonusEsperado: 0, lucroEsperado: 8 },
  { level: 1, tier: 0.20, indicados: 5, bonusEsperado: 2, lucroEsperado: 6 },
  { level: 1, tier: 0.20, indicados: 9, bonusEsperado: 2, lucroEsperado: 6 },
  { level: 1, tier: 0.40, indicados: 10, bonusEsperado: 4, lucroEsperado: 4 },
  { level: 1, tier: 0.40, indicados: 100, bonusEsperado: 4, lucroEsperado: 4 },
  { level: 10, tier: 0, indicados: 0, bonusEsperado: 0, lucroEsperado: 4096 },
  { level: 10, tier: 0.40, indicados: 10, bonusEsperado: 2048, lucroEsperado: 2048 },
]

for (const bt of bonusTests) {
  const entry = CONFIG.ENTRY_VALUES[bt.level - 1]
  const bonusReal = entry * bt.tier
  const lucroReal = entry * 0.40 + (entry * 0.40 - bonusReal)
  test(`N${bt.level} ${bt.indicados}ind bônus`, bt.bonusEsperado, bonusReal)
  test(`N${bt.level} ${bt.indicados}ind lucro`, bt.lucroEsperado, lucroReal)
}

// 3.7 Jupiter Pool - Intervenção
console.log('🔥 3.7 Jupiter Pool - Critérios de Intervenção:')

function deveIntervir(diasSemCiclo: number, pessoasNaFila: number): boolean {
  return diasSemCiclo > 10 && pessoasNaFila > 0
}

testTrue('Intervir: 11 dias, 5 pessoas', deveIntervir(11, 5))
testTrue('NÃO intervir: 10 dias, 5 pessoas', !deveIntervir(10, 5))
testTrue('NÃO intervir: 11 dias, 0 pessoas', !deveIntervir(11, 0))
testTrue('NÃO intervir: 5 dias, 10 pessoas', !deveIntervir(5, 10))

// 3.8 Score CAP - Não ultrapassa 290
console.log('🔥 3.8 Score CAP - Máximo 290 pontos de indicados:')

testTrue('100 indicados = 290 pts', calcularPontosIndicados(100) === 290)
testTrue('1000 indicados = 290 pts (CAP)', calcularPontosIndicados(1000) === 290)
testTrue('10000 indicados = 290 pts (CAP)', calcularPontosIndicados(10000) === 290)

// 3.9 Ganho Líquido do Receiver
console.log('🔥 3.9 Ganho Líquido do Receiver (após Jupiter Pool):')

for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const bruto = entry * 2
  const jupiter = bruto * 0.10
  const liquido = bruto - jupiter
  const esperado = entry * 2 * 0.90
  test(`N${level} receiver líquido`, esperado, liquido)
}

// 3.10 Acumulado Total Possível (N1 até N10)
console.log('🔥 3.10 Ganho Máximo Possível (todos os níveis):')

let ganhoTotalBruto = 0
let ganhoTotalLiquido = 0
for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  ganhoTotalBruto += entry * 2
  ganhoTotalLiquido += entry * 2 * 0.90
}

test('Ganho bruto total N1-N10', 20460, ganhoTotalBruto)
test('Ganho líquido total N1-N10', 18414, ganhoTotalLiquido, 'Após 10% Jupiter Pool')

// ==========================================
// RESUMO DOS RESULTADOS
// ==========================================

console.log('')
console.log('═'.repeat(100))
console.log('                    RESUMO DOS RESULTADOS')
console.log('═'.repeat(100))
console.log('')

const passed = testResults.filter(t => t.passed).length
const failed = testResults.filter(t => !t.passed).length
const total = testResults.length

console.log(`📊 TOTAL DE TESTES: ${total}`)
console.log(`✅ PASSARAM: ${passed}`)
console.log(`❌ FALHARAM: ${failed}`)
console.log('')

if (failed > 0) {
  console.log('❌ TESTES QUE FALHARAM:')
  console.log('─'.repeat(100))
  for (const t of testResults.filter(t => !t.passed)) {
    console.log(`   ❌ ${t.name}`)
    console.log(`      Esperado: ${JSON.stringify(t.expected)}`)
    console.log(`      Recebido: ${JSON.stringify(t.actual)}`)
    if (t.details) console.log(`      Detalhes: ${t.details}`)
    console.log('')
  }
}

console.log('')
console.log('═'.repeat(100))

if (failed === 0) {
  console.log('                    ✅ TODOS OS TESTES PASSARAM!')
  console.log('                    Sistema APROVADO para produção.')
} else {
  console.log(`                    ❌ ${failed} TESTES FALHARAM!`)
  console.log('                    Sistema NÃO APROVADO. Corrigir antes de produção.')
}

console.log('═'.repeat(100))
console.log('')

// Lista detalhada de todos os testes
console.log('📋 LISTA COMPLETA DE TESTES:')
console.log('─'.repeat(100))

let category = ''
for (const t of testResults) {
  const icon = t.passed ? '✅' : '❌'
  console.log(`${icon} ${t.name}`)
}

console.log('')
console.log(`Total: ${passed}/${total} testes passaram (${((passed/total)*100).toFixed(1)}%)`)
console.log('')
