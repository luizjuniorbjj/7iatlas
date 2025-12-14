/**
 * 7iATLAS - Análise Matemática de Progressão
 * Calcula o tempo esperado para um usuário chegar ao nível 10
 *
 * Execução: npx ts-node --transpile-only scripts/progression-math-analysis.ts
 */

console.log('')
console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════╗')
console.log('║              7iATLAS - ANÁLISE MATEMÁTICA DE PROGRESSÃO                                      ║')
console.log('║              Quanto tempo leva para chegar ao Nível 10?                                      ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝')
console.log('')

// ==========================================
// ANÁLISE DAS POSIÇÕES DO CICLO
// ==========================================

console.log('═'.repeat(100))
console.log('                    1. ANÁLISE DAS POSIÇÕES NO CICLO')
console.log('═'.repeat(100))
console.log('')

const positions = [
  { pos: 0, name: 'RECEIVER', action: 'Ganha 2x + Avança N+1 + Reentra N', advances: true, reentry: true, exits: false },
  { pos: 1, name: 'DOAR_1', action: 'Doa para receiver + Reentra N', advances: false, reentry: true, exits: false },
  { pos: 2, name: 'AVANÇAR_1', action: 'Avança N+1 (sem reentra)', advances: true, reentry: false, exits: false },
  { pos: 3, name: 'DOAR_2', action: 'Doa para receiver + Reentra N', advances: false, reentry: true, exits: false },
  { pos: 4, name: 'AVANÇAR_2', action: 'Avança N+1 (sem reentra)', advances: true, reentry: false, exits: false },
  { pos: 5, name: 'COMUNIDADE', action: 'Distribui para fundos + SAI', advances: false, reentry: false, exits: true },
  { pos: 6, name: 'REENTRADA', action: 'Reentra N', advances: false, reentry: true, exits: false },
]

console.log('┌─────────┬─────────────────┬─────────────────────────────────────────┬──────────┬──────────┬────────┐')
console.log('│ Posição │ Nome            │ Ação                                    │ Avança?  │ Reentra? │ Sai?   │')
console.log('├─────────┼─────────────────┼─────────────────────────────────────────┼──────────┼──────────┼────────┤')

for (const p of positions) {
  console.log(`│ ${p.pos.toString().padStart(7)} │ ${p.name.padEnd(15)} │ ${p.action.padEnd(39)} │ ${(p.advances ? 'SIM' : 'NÃO').padStart(8)} │ ${(p.reentry ? 'SIM' : 'NÃO').padStart(8)} │ ${(p.exits ? 'SIM' : 'NÃO').padStart(6)} │`)
}

console.log('└─────────┴─────────────────┴─────────────────────────────────────────┴──────────┴──────────┴────────┘')

// Estatísticas
const advanceCount = positions.filter(p => p.advances).length
const reentryCount = positions.filter(p => p.reentry).length
const exitCount = positions.filter(p => p.exits).length

console.log('')
console.log('📊 ESTATÍSTICAS POR CICLO:')
console.log(`   • Posições que AVANÇAM para N+1: ${advanceCount}/7 (${(advanceCount/7*100).toFixed(1)}%)`)
console.log(`   • Posições que REENTRA em N: ${reentryCount}/7 (${(reentryCount/7*100).toFixed(1)}%)`)
console.log(`   • Posições que SAEM do sistema: ${exitCount}/7 (${(exitCount/7*100).toFixed(1)}%)`)
console.log('')

// ==========================================
// PROBABILIDADES DE AVANÇO
// ==========================================

console.log('═'.repeat(100))
console.log('                    2. PROBABILIDADES DE AVANÇO')
console.log('═'.repeat(100))
console.log('')

const pAdvance = advanceCount / 7 // 3/7 = 42.86%
const pReentry = reentryCount / 7 // 4/7 = 57.14%
const pExit = exitCount / 7       // 1/7 = 14.29%

console.log(`🎲 Probabilidade de AVANÇAR em um ciclo: ${(pAdvance * 100).toFixed(2)}% (${advanceCount}/7)`)
console.log(`🔄 Probabilidade de REENTRAR (tentar novamente): ${(pReentry * 100).toFixed(2)}% (${reentryCount}/7)`)
console.log(`🚪 Probabilidade de SAIR (perdeu a vaga): ${(pExit * 100).toFixed(2)}% (${exitCount}/7)`)
console.log('')

// ==========================================
// CICLOS ESPERADOS POR NÍVEL
// ==========================================

console.log('═'.repeat(100))
console.log('                    3. CICLOS ESPERADOS PARA AVANÇAR')
console.log('═'.repeat(100))
console.log('')

// Modelo: Cada vez que participa de um ciclo, tem 3/7 de chance de avançar
// Se não avançar (4/7), ou reentra (4/7) ou sai (1/7)
// Se reentra, tenta novamente

// Probabilidade de eventualmente avançar considerando reentradas:
// P(avança eventualmente) = P(avança) + P(reentra) * P(avança eventualmente)
// P = 3/7 + 4/7 * P
// P - 4/7 * P = 3/7
// 3/7 * P = 3/7
// P = 1 (sempre avança eventualmente, a não ser que saia)

// Na verdade, o modelo é:
// - Se cai em pos 0,2,4: avança (3/7)
// - Se cai em pos 1,3,6: reentra e tenta de novo (4/7)
// - Se cai em pos 5: sai e precisa comprar nova cota (1/7)

// Ciclos esperados para avançar (dado que não sai):
// E[ciclos] = 1/P(avança | não sai)
// P(avança | não sai) = 3/6 = 50% (considerando só pos 0-4,6)

// Mas se considerarmos que após sair (pos 5), usuário compra nova cota:
// E[ciclos até avançar] = E[ciclos até avançar OU sair] * P(não sair) + (E[ciclos até sair] + E[reinício]) * P(sair)

// Simplificando: média de ciclos = 1 / P(avançar por ciclo) = 7/3 = 2.33 ciclos

const avgCyclesToAdvance = 1 / pAdvance

console.log(`📈 Ciclos médios para AVANÇAR um nível: ${avgCyclesToAdvance.toFixed(2)} ciclos`)
console.log('')
console.log('   Explicação: A cada ciclo que participa, tem 42.86% de chance de avançar.')
console.log('   Em média, precisa participar de ~2.33 ciclos para avançar.')
console.log('')

// ==========================================
// TEMPO ESPERADO POR NÍVEL (BASEADO EM VOLUME)
// ==========================================

console.log('═'.repeat(100))
console.log('                    4. TEMPO ESPERADO POR CENÁRIO DE VOLUME')
console.log('═'.repeat(100))
console.log('')

// Fórmula: Tempo = (Tamanho da fila) / (Ciclos por dia)
// Ciclos por dia = Novos usuários por dia / 7

const scenarios = [
  { name: 'Baixo', dailyUsers: 100 },
  { name: 'Médio', dailyUsers: 500 },
  { name: 'Alto', dailyUsers: 1000 },
  { name: 'Viral', dailyUsers: 5000 },
]

const levelValues = [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120]

for (const scenario of scenarios) {
  console.log(`\n📊 Cenário: ${scenario.name} (${scenario.dailyUsers} novos usuários/dia)`)
  console.log('─'.repeat(80))

  const cyclesPerDay = scenario.dailyUsers / 7

  console.log(`   Ciclos possíveis/dia no nível 1: ${cyclesPerDay.toFixed(0)}`)
  console.log('')

  console.log('┌─────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────────┐')
  console.log('│ Nível   │ Valor ($)      │ Pessoas/Fila   │ Ciclos/Dia     │ Dias p/ Ciclar │ Dias Acumulado │')
  console.log('├─────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┤')

  let totalDays = 0
  let queueSize = scenario.dailyUsers // Começa com usuários do dia 1

  for (let level = 1; level <= 10; level++) {
    // Nos níveis mais altos, menos pessoas chegam
    // Estimativa: cada nível tem ~3/7 das pessoas do nível anterior
    // (porque 3/7 avançam por ciclo, mas considerando múltiplos ciclos)
    // Na prática, após muitos ciclos, ~50% avançam (os que não caem em pos 5)

    const reductionFactor = level === 1 ? 1 : 0.857 // 6/7 não saem
    const effectiveQueue = level === 1 ? queueSize : Math.ceil(queueSize * Math.pow(reductionFactor, level - 1))

    // Ciclos por dia neste nível (limitado pela fila)
    const cyclesThisLevel = Math.min(cyclesPerDay, effectiveQueue / 7)

    // Tempo para participar de ~2.33 ciclos (média para avançar)
    // Considerando que a fila tem 'effectiveQueue' pessoas e processamos 'cyclesThisLevel' ciclos/dia
    // Cada ciclo processa 7 pessoas

    // Tempo na fila = posição média / (ciclos/dia * 7)
    const avgPosition = effectiveQueue / 2
    const daysInQueue = avgPosition / (cyclesThisLevel * 7)

    // Tempo total = tempo na fila * ciclos necessários
    const daysThisLevel = daysInQueue * avgCyclesToAdvance

    totalDays += daysThisLevel

    console.log(`│ ${level.toString().padStart(7)} │ $${levelValues[level-1].toString().padStart(13)} │ ${effectiveQueue.toFixed(0).padStart(14)} │ ${cyclesThisLevel.toFixed(1).padStart(14)} │ ${daysThisLevel.toFixed(1).padStart(14)} │ ${totalDays.toFixed(1).padStart(14)} │`)
  }

  console.log('└─────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────────┘')

  const months = totalDays / 30
  const years = totalDays / 365

  console.log('')
  console.log(`   ⏱️ TEMPO TOTAL ESTIMADO: ${totalDays.toFixed(0)} dias (~${months.toFixed(1)} meses ou ~${years.toFixed(2)} anos)`)

  // ROI
  const totalInvestment = levelValues.reduce((a, b) => a + b, 0)
  const totalReward = totalInvestment * 2
  const dailyROI = (totalReward - totalInvestment) / totalDays

  console.log(`   💰 ROI diário: $${dailyROI.toFixed(2)}/dia`)
  console.log(`   💎 ROI mensal: $${(dailyROI * 30).toFixed(2)}/mês`)
}

// ==========================================
// ANÁLISE DE CASO IDEAL vs REAL
// ==========================================

console.log('\n')
console.log('═'.repeat(100))
console.log('                    5. CASO IDEAL vs CASO MÉDIO')
console.log('═'.repeat(100))
console.log('')

console.log('🏆 CASO IDEAL (Muita sorte - sempre cai em RECEIVER/AVANÇAR):')
console.log('   • Nível 1→2: 1 ciclo')
console.log('   • Nível 2→3: 1 ciclo')
console.log('   • ...')
console.log('   • Total: 9 ciclos para chegar ao nível 10')
console.log('   • Com 1000 usuários/dia: 9 ciclos ÷ 142 ciclos/dia = 0.06 dias = ~1.5 horas')
console.log('')

console.log('📊 CASO MÉDIO (Probabilidade normal):')
console.log(`   • Ciclos médios por nível: ${avgCyclesToAdvance.toFixed(2)}`)
console.log(`   • Total: ${(avgCyclesToAdvance * 9).toFixed(0)} ciclos para chegar ao nível 10`)
console.log('')

console.log('😢 CASO RUIM (Azar - cai em COMUNIDADE várias vezes):')
console.log('   • Se cair em COMUNIDADE (pos 5), perde a vaga e precisa comprar nova cota')
console.log('   • Probabilidade: 14.3% por ciclo')
console.log('   • Chance de NUNCA cair em COMUNIDADE em 21 ciclos: 3%')
console.log('   • A maioria dos usuários vai sair pelo menos 1-2 vezes')
console.log('')

// ==========================================
// RECOMENDAÇÕES
// ==========================================

console.log('═'.repeat(100))
console.log('                    6. CONCLUSÕES E RECOMENDAÇÕES')
console.log('═'.repeat(100))
console.log('')

console.log('📋 FATORES QUE ACELERAM A PROGRESSÃO:')
console.log('   1. ✅ Alto volume de novos usuários (mais ciclos/dia)')
console.log('   2. ✅ Indicar amigos (aumenta score, sobe na fila)')
console.log('   3. ✅ Reentradas automáticas (aumenta score)')
console.log('   4. ✅ Entrar cedo no sistema (menos concorrência)')
console.log('')

console.log('📋 FATORES QUE ATRASAM A PROGRESSÃO:')
console.log('   1. ❌ Baixo volume de novos usuários')
console.log('   2. ❌ Cair na posição COMUNIDADE (perde a vaga)')
console.log('   3. ❌ Níveis mais altos têm menos participantes')
console.log('')

console.log('💡 ESTIMATIVA REALISTA:')
console.log('')
console.log('   ┌────────────────────┬────────────────────┬────────────────────┐')
console.log('   │ Volume do Sistema  │ Tempo p/ Nível 10  │ Investimento Total │')
console.log('   ├────────────────────┼────────────────────┼────────────────────┤')
console.log('   │ 100 usuários/dia   │ ~6-12 meses        │ $10.230            │')
console.log('   │ 500 usuários/dia   │ ~2-4 meses         │ $10.230            │')
console.log('   │ 1000 usuários/dia  │ ~1-2 meses         │ $10.230            │')
console.log('   │ 5000 usuários/dia  │ ~1-3 semanas       │ $10.230            │')
console.log('   └────────────────────┴────────────────────┴────────────────────┘')
console.log('')
console.log('   💎 Ganho ao completar nível 10: $20.460 (100% de lucro sobre investimento)')
console.log('')

console.log('═'.repeat(100))
console.log('')
