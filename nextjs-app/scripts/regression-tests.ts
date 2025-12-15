/**
 * 7iATLAS - TESTES DE REGRESSÃO
 *
 * Objetivo: Garantir que mudanças futuras não quebrem funcionalidades existentes
 * Estes testes capturam o comportamento atual do sistema como "baseline"
 * e verificam que o comportamento permanece consistente após modificações.
 *
 * Categorias:
 * 1. Snapshots de Cálculos - Valores esperados para inputs conhecidos
 * 2. Contratos de API - Estrutura e tipos de resposta
 * 3. Comportamentos Críticos - Fluxos que NUNCA devem mudar
 * 4. Invariantes do Sistema - Regras imutáveis
 * 5. Compatibilidade - Dados antigos devem funcionar
 */

// ==========================================
// CONFIGURAÇÃO BASE (IMUTÁVEL)
// ==========================================

const CONFIG = {
  ENTRY_VALUES: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120],
  POSITIONS_PER_CYCLE: 7,
  MAX_LEVEL: 10,
  JUPITER_POOL_PERCENT: 0.10,
  RESERVE_PERCENT: 0.10,
  OPERATIONAL_PERCENT: 0.10,
  BONUS_TIERS: [
    { min: 0, max: 4, percent: 0 },
    { min: 5, max: 9, percent: 0.20 },
    { min: 10, max: Infinity, percent: 0.40 }
  ],
  SCORE_CAP: 290,
  MAX_QUOTAS: 10,
  PIN_MAX_ATTEMPTS: 3,
  RATE_LIMIT: 100
}

// Contadores de teste
let passed = 0
let failed = 0
const results: { category: string; name: string; passed: boolean; expected: any; actual: any }[] = []

function test(category: string, name: string, actual: any, expected: any): boolean {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected)
  if (isEqual) {
    passed++
    results.push({ category, name, passed: true, expected, actual })
    return true
  } else {
    failed++
    results.push({ category, name, passed: false, expected, actual })
    console.log(`❌ ${category} - ${name}`)
    console.log(`   Esperado: ${JSON.stringify(expected)}`)
    console.log(`   Atual:    ${JSON.stringify(actual)}`)
    return false
  }
}

function testRange(category: string, name: string, actual: number, min: number, max: number): boolean {
  const inRange = actual >= min && actual <= max
  if (inRange) {
    passed++
    results.push({ category, name, passed: true, expected: `[${min}, ${max}]`, actual })
    return true
  } else {
    failed++
    results.push({ category, name, passed: false, expected: `[${min}, ${max}]`, actual })
    console.log(`❌ ${category} - ${name}`)
    console.log(`   Esperado: entre ${min} e ${max}`)
    console.log(`   Atual:    ${actual}`)
    return false
  }
}

// ==========================================
// FUNÇÕES DO SISTEMA (PARA TESTE)
// ==========================================

function calculateReceiverReward(entryValue: number): { gross: number; jupiter: number; net: number } {
  const gross = entryValue * 2 // pos 1 + pos 3
  const jupiter = gross * CONFIG.JUPITER_POOL_PERCENT
  const net = gross - jupiter
  return { gross, jupiter, net }
}

function calculatePos5Distribution(entryValue: number, bonusTier: number): {
  reserve: number
  operational: number
  bonus: number
  profit: number
} {
  const reserve = entryValue * CONFIG.RESERVE_PERCENT
  const operational = entryValue * CONFIG.OPERATIONAL_PERCENT
  const bonusPercent = CONFIG.BONUS_TIERS[bonusTier].percent
  const bonus = entryValue * bonusPercent
  const profit = entryValue * 0.40 + (entryValue * 0.40 - bonus)
  return { reserve, operational, bonus, profit }
}

function calculateScore(timeInQueue: number, reentries: number, referrals: number): number {
  // Proteção contra valores negativos
  const safeTime = Math.max(0, timeInQueue)
  const safeReentries = Math.max(0, reentries)
  const safeReferrals = Math.max(0, referrals)

  const timeScore = Math.floor(safeTime / (24 * 60 * 60 * 1000)) * 2
  const reentryScore = safeReentries * 1.5
  const referralScore = Math.min(safeReferrals * 10, CONFIG.SCORE_CAP)
  return Math.max(0, timeScore + reentryScore + referralScore)
}

function getBonusTier(referralCount: number): number {
  if (referralCount >= 10) return 2
  if (referralCount >= 5) return 1
  return 0
}

function calculateCycleCashFlow(level: number): {
  required: number
  toReceiver: number
  toJupiter: number
  toNextLevel: number
  toPos5: number
  remaining: number
} {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const required = entry * 7
  const toReceiver = entry * 2 * 0.90 // líquido após Jupiter
  const toJupiter = entry * 2 * 0.10
  const toNextLevel = level < 10 ? entry * 2 : 0
  const toPos5 = entry
  const remaining = entry * 2 // pos 0 + pos 6

  return { required, toReceiver, toJupiter, toNextLevel, toPos5, remaining }
}

// ==========================================
// INÍCIO DOS TESTES
// ==========================================

console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════╗')
console.log('║              7iATLAS - TESTES DE REGRESSÃO                                                   ║')
console.log('║              Baseline de Comportamentos Esperados                                            ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝')
console.log('')

// ==========================================
// 1. SNAPSHOTS DE CÁLCULOS
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    1. SNAPSHOTS DE CÁLCULOS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 1.1 Receiver Reward - Nível 1
const rewardN1 = calculateReceiverReward(10)
test('1. Snapshots', '1.1a Receiver N1 - Gross', rewardN1.gross, 20)
test('1. Snapshots', '1.1b Receiver N1 - Jupiter', rewardN1.jupiter, 2)
test('1. Snapshots', '1.1c Receiver N1 - Net', rewardN1.net, 18)

// 1.2 Receiver Reward - Nível 5
const rewardN5 = calculateReceiverReward(160)
test('1. Snapshots', '1.2a Receiver N5 - Gross', rewardN5.gross, 320)
test('1. Snapshots', '1.2b Receiver N5 - Jupiter', rewardN5.jupiter, 32)
test('1. Snapshots', '1.2c Receiver N5 - Net', rewardN5.net, 288)

// 1.3 Receiver Reward - Nível 10
const rewardN10 = calculateReceiverReward(5120)
test('1. Snapshots', '1.3a Receiver N10 - Gross', rewardN10.gross, 10240)
test('1. Snapshots', '1.3b Receiver N10 - Jupiter', rewardN10.jupiter, 1024)
test('1. Snapshots', '1.3c Receiver N10 - Net', rewardN10.net, 9216)

// 1.4 Pos5 Distribution - Tier 0 (0-4 referrals)
const pos5Tier0 = calculatePos5Distribution(10, 0)
test('1. Snapshots', '1.4a Pos5 Tier0 - Reserve', pos5Tier0.reserve, 1)
test('1. Snapshots', '1.4b Pos5 Tier0 - Operational', pos5Tier0.operational, 1)
test('1. Snapshots', '1.4c Pos5 Tier0 - Bonus', pos5Tier0.bonus, 0)
test('1. Snapshots', '1.4d Pos5 Tier0 - Profit', pos5Tier0.profit, 8)

// 1.5 Pos5 Distribution - Tier 1 (5-9 referrals)
const pos5Tier1 = calculatePos5Distribution(10, 1)
test('1. Snapshots', '1.5a Pos5 Tier1 - Reserve', pos5Tier1.reserve, 1)
test('1. Snapshots', '1.5b Pos5 Tier1 - Operational', pos5Tier1.operational, 1)
test('1. Snapshots', '1.5c Pos5 Tier1 - Bonus', pos5Tier1.bonus, 2)
test('1. Snapshots', '1.5d Pos5 Tier1 - Profit', pos5Tier1.profit, 6)

// 1.6 Pos5 Distribution - Tier 2 (10+ referrals)
const pos5Tier2 = calculatePos5Distribution(10, 2)
test('1. Snapshots', '1.6a Pos5 Tier2 - Reserve', pos5Tier2.reserve, 1)
test('1. Snapshots', '1.6b Pos5 Tier2 - Operational', pos5Tier2.operational, 1)
test('1. Snapshots', '1.6c Pos5 Tier2 - Bonus', pos5Tier2.bonus, 4)
test('1. Snapshots', '1.6d Pos5 Tier2 - Profit', pos5Tier2.profit, 4)

// 1.7 Cash Flow por Ciclo
for (let level = 1; level <= 10; level++) {
  const cf = calculateCycleCashFlow(level)
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  test('1. Snapshots', `1.7.${level}a Cash Flow N${level} - Required`, cf.required, entry * 7)
  test('1. Snapshots', `1.7.${level}b Cash Flow N${level} - Net Receiver`, cf.toReceiver, entry * 2 * 0.90)
  test('1. Snapshots', `1.7.${level}c Cash Flow N${level} - Jupiter`, cf.toJupiter, entry * 2 * 0.10)
  if (level < 10) {
    test('1. Snapshots', `1.7.${level}d Cash Flow N${level} - Next Level`, cf.toNextLevel, entry * 2)
  } else {
    test('1. Snapshots', `1.7.${level}d Cash Flow N10 - Next Level (0)`, cf.toNextLevel, 0)
  }
}

console.log(`   ✅ Snapshots de cálculos verificados`)
console.log('')

// ==========================================
// 2. CONTRATOS DE API
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    2. CONTRATOS DE API')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 2.1 Estrutura de Resposta - Receiver Reward
const rewardStructure = calculateReceiverReward(10)
test('2. Contratos', '2.1a Reward tem propriedade gross', 'gross' in rewardStructure, true)
test('2. Contratos', '2.1b Reward tem propriedade jupiter', 'jupiter' in rewardStructure, true)
test('2. Contratos', '2.1c Reward tem propriedade net', 'net' in rewardStructure, true)
test('2. Contratos', '2.1d Reward gross é number', typeof rewardStructure.gross, 'number')
test('2. Contratos', '2.1e Reward jupiter é number', typeof rewardStructure.jupiter, 'number')
test('2. Contratos', '2.1f Reward net é number', typeof rewardStructure.net, 'number')

// 2.2 Estrutura de Resposta - Pos5 Distribution
const pos5Structure = calculatePos5Distribution(10, 0)
test('2. Contratos', '2.2a Pos5 tem propriedade reserve', 'reserve' in pos5Structure, true)
test('2. Contratos', '2.2b Pos5 tem propriedade operational', 'operational' in pos5Structure, true)
test('2. Contratos', '2.2c Pos5 tem propriedade bonus', 'bonus' in pos5Structure, true)
test('2. Contratos', '2.2d Pos5 tem propriedade profit', 'profit' in pos5Structure, true)

// 2.3 Estrutura de Resposta - Cash Flow
const cfStructure = calculateCycleCashFlow(1)
test('2. Contratos', '2.3a CashFlow tem required', 'required' in cfStructure, true)
test('2. Contratos', '2.3b CashFlow tem toReceiver', 'toReceiver' in cfStructure, true)
test('2. Contratos', '2.3c CashFlow tem toJupiter', 'toJupiter' in cfStructure, true)
test('2. Contratos', '2.3d CashFlow tem toNextLevel', 'toNextLevel' in cfStructure, true)
test('2. Contratos', '2.3e CashFlow tem toPos5', 'toPos5' in cfStructure, true)
test('2. Contratos', '2.3f CashFlow tem remaining', 'remaining' in cfStructure, true)

// 2.4 Tipos de Retorno
test('2. Contratos', '2.4a getBonusTier retorna number', typeof getBonusTier(5), 'number')
test('2. Contratos', '2.4b calculateScore retorna number', typeof calculateScore(0, 0, 0), 'number')

console.log(`   ✅ Contratos de API verificados`)
console.log('')

// ==========================================
// 3. COMPORTAMENTOS CRÍTICOS
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    3. COMPORTAMENTOS CRÍTICOS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 3.1 Jupiter Pool SEMPRE recebe 10% do gross do receiver
for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const reward = calculateReceiverReward(entry)
  const expectedJupiter = entry * 2 * 0.10
  test('3. Críticos', `3.1.${level} Jupiter N${level} = 10% de gross`, reward.jupiter, expectedJupiter)
}

// 3.2 Bonus Tiers NUNCA mudam
test('3. Críticos', '3.2a Tier 0 = 0% (0-4 refs)', getBonusTier(0), 0)
test('3. Críticos', '3.2b Tier 0 = 0% (4 refs)', getBonusTier(4), 0)
test('3. Críticos', '3.2c Tier 1 = 20% (5 refs)', getBonusTier(5), 1)
test('3. Críticos', '3.2d Tier 1 = 20% (9 refs)', getBonusTier(9), 1)
test('3. Críticos', '3.2e Tier 2 = 40% (10 refs)', getBonusTier(10), 2)
test('3. Críticos', '3.2f Tier 2 = 40% (100 refs)', getBonusTier(100), 2)

// 3.3 Entry Values NUNCA mudam
const expectedEntryValues = [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120]
for (let i = 0; i < 10; i++) {
  test('3. Críticos', `3.3.${i + 1} Entry Value N${i + 1}`, CONFIG.ENTRY_VALUES[i], expectedEntryValues[i])
}

// 3.4 Score CAP NUNCA muda
test('3. Críticos', '3.4 Score CAP = 290', CONFIG.SCORE_CAP, 290)

// 3.5 Score CAP é aplicado corretamente
const scoreWithCap = calculateScore(0, 0, 50) // 50 refs * 10 = 500, mas CAP = 290
test('3. Críticos', '3.5 Score respeita CAP', scoreWithCap, 290)

// 3.6 Net = Gross - Jupiter (SEMPRE)
for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const reward = calculateReceiverReward(entry)
  test('3. Críticos', `3.6.${level} Net = Gross - Jupiter`, reward.net, reward.gross - reward.jupiter)
}

// 3.7 Pos5 distribuição soma 100%
for (let tier = 0; tier <= 2; tier++) {
  const dist = calculatePos5Distribution(100, tier)
  const total = dist.reserve + dist.operational + dist.bonus + dist.profit
  test('3. Críticos', `3.7.${tier + 1} Pos5 Tier${tier} soma 100%`, total, 100)
}

// 3.8 Progressão geométrica de níveis (cada nível = anterior * 2)
for (let i = 1; i < 10; i++) {
  const ratio = CONFIG.ENTRY_VALUES[i] / CONFIG.ENTRY_VALUES[i - 1]
  test('3. Críticos', `3.8.${i} N${i + 1} = N${i} * 2`, ratio, 2)
}

console.log(`   ✅ Comportamentos críticos verificados`)
console.log('')

// ==========================================
// 4. INVARIANTES DO SISTEMA
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    4. INVARIANTES DO SISTEMA')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 4.1 Número de posições por ciclo
test('4. Invariantes', '4.1 Posições por ciclo = 7', CONFIG.POSITIONS_PER_CYCLE, 7)

// 4.2 Número máximo de níveis
test('4. Invariantes', '4.2 Níveis máximos = 10', CONFIG.MAX_LEVEL, 10)

// 4.3 Limite de cotas por nível
test('4. Invariantes', '4.3 Max cotas por nível = 10', CONFIG.MAX_QUOTAS, 10)

// 4.4 Tentativas máximas de PIN
test('4. Invariantes', '4.4 Max tentativas PIN = 3', CONFIG.PIN_MAX_ATTEMPTS, 3)

// 4.5 Rate limit
test('4. Invariantes', '4.5 Rate limit = 100 req', CONFIG.RATE_LIMIT, 100)

// 4.6 Percentuais de distribuição
test('4. Invariantes', '4.6a Jupiter Pool = 10%', CONFIG.JUPITER_POOL_PERCENT, 0.10)
test('4. Invariantes', '4.6b Reserve = 10%', CONFIG.RESERVE_PERCENT, 0.10)
test('4. Invariantes', '4.6c Operational = 10%', CONFIG.OPERATIONAL_PERCENT, 0.10)

// 4.7 Ciclo requer exatamente 7 participantes
for (let level = 1; level <= 10; level++) {
  const cf = calculateCycleCashFlow(level)
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  test('4. Invariantes', `4.7.${level} Ciclo N${level} requer 7 entradas`, cf.required, entry * 7)
}

// 4.8 Receiver SEMPRE recebe de pos 1 + pos 3 (2 entradas)
for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const reward = calculateReceiverReward(entry)
  test('4. Invariantes', `4.8.${level} Receiver N${level} recebe 2× entrada`, reward.gross, entry * 2)
}

// 4.9 Score NUNCA é negativo
const negativeInputScore = calculateScore(-1, -1, -1)
test('4. Invariantes', '4.9 Score mínimo >= 0', negativeInputScore >= 0, true)

// 4.10 Bonus Percent NUNCA excede 40%
for (let refs = 0; refs <= 100; refs++) {
  const tier = getBonusTier(refs)
  const percent = CONFIG.BONUS_TIERS[tier].percent
  if (percent > 0.40) {
    test('4. Invariantes', `4.10 Bonus ${refs} refs <= 40%`, false, true)
    break
  }
}
test('4. Invariantes', '4.10 Bonus NUNCA > 40%', true, true)

console.log(`   ✅ Invariantes do sistema verificados`)
console.log('')

// ==========================================
// 5. COMPATIBILIDADE RETROATIVA
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    5. COMPATIBILIDADE RETROATIVA')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 5.1 Dados legados - formato de wallet antigo
const legacyWalletFormats = [
  '0x1234567890abcdef1234567890abcdef12345678',
  '0xABCDEF1234567890abcdef1234567890abcdef12',
  '0x0000000000000000000000000000000000000000'
]
for (let i = 0; i < legacyWalletFormats.length; i++) {
  const wallet = legacyWalletFormats[i]
  const isValid = /^0x[a-fA-F0-9]{40}$/.test(wallet)
  test('5. Compat', `5.1.${i + 1} Wallet legado válido`, isValid, true)
}

// 5.2 Dados legados - TX hash
const legacyTxFormats = [
  '0x' + 'a'.repeat(64),
  '0x' + 'A'.repeat(64),
  '0x' + '1234567890abcdef'.repeat(4)
]
for (let i = 0; i < legacyTxFormats.length; i++) {
  const tx = legacyTxFormats[i]
  const isValid = /^0x[a-fA-F0-9]{64}$/.test(tx)
  test('5. Compat', `5.2.${i + 1} TX hash legado válido`, isValid, true)
}

// 5.3 Usuários migrados - cálculos devem bater
// Simular usuário que foi migrado de sistema antigo
const legacyUserData = {
  totalDeposited: 70, // 7 entradas N1
  expectedBalance: 18, // Completou 1 ciclo como receiver
  level: 1
}
const migrationReward = calculateReceiverReward(CONFIG.ENTRY_VALUES[0])
test('5. Compat', '5.3 Migração - reward N1 = $18', migrationReward.net, legacyUserData.expectedBalance)

// 5.4 Formatos de data antigos devem ser parseados
const legacyDates = [
  '2024-01-15T10:30:00Z',
  '2024-12-31T23:59:59.999Z',
  '2025-06-15T00:00:00.000Z'
]
for (let i = 0; i < legacyDates.length; i++) {
  const date = new Date(legacyDates[i])
  const isValid = !isNaN(date.getTime())
  test('5. Compat', `5.4.${i + 1} Data ISO válida`, isValid, true)
}

// 5.5 Valores monetários legados (centavos)
const legacyAmounts = [
  { cents: 1000, dollars: 10 },
  { cents: 2000, dollars: 20 },
  { cents: 512000, dollars: 5120 }
]
for (let i = 0; i < legacyAmounts.length; i++) {
  const converted = legacyAmounts[i].cents / 100
  test('5. Compat', `5.5.${i + 1} Centavos → Dólares`, converted, legacyAmounts[i].dollars)
}

// 5.6 IDs numéricos antigos devem ser aceitos
const legacyNumericIds = [1, 100, 999999, 2147483647]
for (let i = 0; i < legacyNumericIds.length; i++) {
  const id = legacyNumericIds[i]
  const isValid = Number.isInteger(id) && id > 0
  test('5. Compat', `5.6.${i + 1} ID numérico válido`, isValid, true)
}

// 5.7 IDs UUID devem ser aceitos
const legacyUuids = [
  '550e8400-e29b-41d4-a716-446655440000',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '00000000-0000-0000-0000-000000000001'
]
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
for (let i = 0; i < legacyUuids.length; i++) {
  const uuid = legacyUuids[i]
  const isValid = uuidRegex.test(uuid)
  test('5. Compat', `5.7.${i + 1} UUID válido`, isValid, true)
}

console.log(`   ✅ Compatibilidade retroativa verificada`)
console.log('')

// ==========================================
// 6. CENÁRIOS DE BORDA CONHECIDOS
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    6. CENÁRIOS DE BORDA CONHECIDOS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 6.1 Nível 10 - comportamento especial
const cfN10 = calculateCycleCashFlow(10)
test('6. Bordas', '6.1 N10 não alimenta N11', cfN10.toNextLevel, 0)

// 6.2 Primeiro ciclo - sem histórico
const firstCycleScore = calculateScore(0, 0, 0)
test('6. Bordas', '6.2 Primeiro ciclo score = 0', firstCycleScore, 0)

// 6.3 Usuário com exatamente 5 referrals (limite tier)
test('6. Bordas', '6.3a Tier para 4 refs', getBonusTier(4), 0)
test('6. Bordas', '6.3b Tier para 5 refs', getBonusTier(5), 1)

// 6.4 Usuário com exatamente 10 referrals (limite tier)
test('6. Bordas', '6.4a Tier para 9 refs', getBonusTier(9), 1)
test('6. Bordas', '6.4b Tier para 10 refs', getBonusTier(10), 2)

// 6.5 Score com CAP exato
const exactCapScore = calculateScore(0, 0, 29) // 29 * 10 = 290 (exatamente o CAP)
test('6. Bordas', '6.5 Score exatamente no CAP', exactCapScore, 290)

// 6.6 Score acima do CAP
const overCapScore = calculateScore(0, 0, 30) // 30 * 10 = 300, mas CAP = 290
test('6. Bordas', '6.6 Score limitado ao CAP', overCapScore, 290)

// 6.7 Valor mínimo de entrada
const minEntry = CONFIG.ENTRY_VALUES[0]
test('6. Bordas', '6.7 Valor mínimo = $10', minEntry, 10)

// 6.8 Valor máximo de entrada
const maxEntry = CONFIG.ENTRY_VALUES[9]
test('6. Bordas', '6.8 Valor máximo = $5120', maxEntry, 5120)

// 6.9 Total investimento máximo teórico (10 cotas × 10 níveis)
let maxInvestment = 0
for (let i = 0; i < 10; i++) {
  maxInvestment += CONFIG.ENTRY_VALUES[i] * CONFIG.MAX_QUOTAS
}
test('6. Bordas', '6.9 Max investimento = $102,300', maxInvestment, 102300)

// 6.10 Jupiter Pool - valor mínimo
const minJupiter = calculateReceiverReward(10).jupiter
test('6. Bordas', '6.10 Jupiter mínimo = $2', minJupiter, 2)

// 6.11 Jupiter Pool - valor máximo por ciclo
const maxJupiter = calculateReceiverReward(5120).jupiter
test('6. Bordas', '6.11 Jupiter máximo = $1024', maxJupiter, 1024)

console.log(`   ✅ Cenários de borda verificados`)
console.log('')

// ==========================================
// 7. CONSISTÊNCIA ENTRE NÍVEIS
// ==========================================

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('                    7. CONSISTÊNCIA ENTRE NÍVEIS')
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
console.log('')

// 7.1 Proporção Jupiter/Gross constante (10%)
for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const reward = calculateReceiverReward(entry)
  const ratio = reward.jupiter / reward.gross
  test('7. Consistência', `7.1.${level} Jupiter/Gross N${level} = 10%`, ratio, 0.10)
}

// 7.2 Proporção Net/Gross constante (90%)
for (let level = 1; level <= 10; level++) {
  const entry = CONFIG.ENTRY_VALUES[level - 1]
  const reward = calculateReceiverReward(entry)
  const ratio = reward.net / reward.gross
  test('7. Consistência', `7.2.${level} Net/Gross N${level} = 90%`, ratio, 0.90)
}

// 7.3 Cash flow proporcional ao nível
for (let level = 2; level <= 10; level++) {
  const cfPrev = calculateCycleCashFlow(level - 1)
  const cfCurr = calculateCycleCashFlow(level)
  const ratio = cfCurr.required / cfPrev.required
  test('7. Consistência', `7.3.${level} Cash N${level}/N${level - 1} = 2×`, ratio, 2)
}

// 7.4 Pos5 distribuição consistente entre tiers
for (let tier = 0; tier <= 2; tier++) {
  const dist = calculatePos5Distribution(100, tier)
  test('7. Consistência', `7.4.${tier + 1}a Pos5 Tier${tier} Reserve = 10%`, dist.reserve, 10)
  test('7. Consistência', `7.4.${tier + 1}b Pos5 Tier${tier} Operational = 10%`, dist.operational, 10)
}

console.log(`   ✅ Consistência entre níveis verificada`)
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
  const cat = r.category
  if (!categories.has(cat)) {
    categories.set(cat, { passed: 0, failed: 0 })
  }
  const c = categories.get(cat)!
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
  console.log('                    ✅ TODOS OS TESTES DE REGRESSÃO PASSARAM!')
  console.log('                    Baseline de comportamento está intacto.')
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
} else {
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
  console.log('                    ❌ ALGUNS TESTES FALHARAM!')
  console.log('                    Comportamento do sistema mudou - investigar!')
  console.log('════════════════════════════════════════════════════════════════════════════════════════════════════')
}

console.log('')
console.log(`Total: ${passed}/${total} testes passaram (${percentage}%)`)

// Exit com código de erro se houver falhas
if (failed > 0) {
  process.exit(1)
}
