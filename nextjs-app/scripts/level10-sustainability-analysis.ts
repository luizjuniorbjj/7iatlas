/**
 * 7iATLAS - Análise de Sustentabilidade do Nível 10
 *
 * PERGUNTA CRÍTICA: Se todos chegam ao nível 10 e ficam ciclando infinitamente,
 * o sistema é sustentável?
 *
 * Execução: npx ts-node --transpile-only scripts/level10-sustainability-analysis.ts
 */

console.log('')
console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════╗')
console.log('║              7iATLAS - ANÁLISE DE SUSTENTABILIDADE DO NÍVEL 10                               ║')
console.log('║              O sistema aguenta todos no nível 10?                                            ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝')
console.log('')

// ==========================================
// 1. ANÁLISE DO FLUXO DE ENTRADA/SAÍDA
// ==========================================

console.log('═'.repeat(100))
console.log('                    1. FLUXO DE DINHEIRO POR CICLO NO NÍVEL 10')
console.log('═'.repeat(100))
console.log('')

const ENTRY_VALUE_N10 = 5120
const REWARD_VALUE_N10 = 10240 // 2x
const CYCLE_SIZE = 7

console.log(`💰 Valor de entrada no Nível 10: $${ENTRY_VALUE_N10}`)
console.log(`💎 Ganho do RECEIVER: $${REWARD_VALUE_N10}`)
console.log(`👥 Participantes por ciclo: ${CYCLE_SIZE}`)
console.log('')

// Entrada de dinheiro por ciclo (7 pessoas × $5.120)
const totalEntryPerCycle = ENTRY_VALUE_N10 * CYCLE_SIZE
console.log(`📥 ENTRADA por ciclo: 7 × $${ENTRY_VALUE_N10} = $${totalEntryPerCycle}`)

// Saída de dinheiro por ciclo
const receiverPayout = REWARD_VALUE_N10
const communityDistribution = ENTRY_VALUE_N10 // Posição 5 distribui $5.120

// Posição 5 distribui: 10% reserva, 10% operacional, 40% bônus, 40% lucro
const reserveAmount = communityDistribution * 0.10
const operationalAmount = communityDistribution * 0.10
const bonusAmount = communityDistribution * 0.40
const profitAmount = communityDistribution * 0.40

console.log('')
console.log(`📤 SAÍDAS por ciclo:`)
console.log(`   • RECEIVER (pos 0): $${receiverPayout} (pago ao usuário)`)
console.log(`   • COMUNIDADE (pos 5): $${communityDistribution} distribuído:`)
console.log(`     - Reserva (10%): $${reserveAmount}`)
console.log(`     - Operacional (10%): $${operationalAmount}`)
console.log(`     - Bônus indicação (40%): $${bonusAmount}`)
console.log(`     - Lucro sistema (40%): $${profitAmount}`)
console.log('')

// Onde vai o dinheiro das outras posições?
console.log('📊 DESTINO DO DINHEIRO DE CADA POSIÇÃO:')
console.log('')
console.log('┌─────────┬─────────────────┬────────────────┬────────────────────────────────────────┐')
console.log('│ Posição │ Nome            │ Valor ($)      │ Destino                                │')
console.log('├─────────┼─────────────────┼────────────────┼────────────────────────────────────────┤')
console.log(`│       0 │ RECEIVER        │ ${ENTRY_VALUE_N10.toString().padStart(14)} │ RECEBE $${REWARD_VALUE_N10} (de pos 1 e 3)        │`)
console.log(`│       1 │ DOAR_1          │ ${ENTRY_VALUE_N10.toString().padStart(14)} │ → Vai para RECEIVER                    │`)
console.log(`│       2 │ AVANÇAR_1       │ ${ENTRY_VALUE_N10.toString().padStart(14)} │ → PERDIDO (não há N+1)                 │`)
console.log(`│       3 │ DOAR_2          │ ${ENTRY_VALUE_N10.toString().padStart(14)} │ → Vai para RECEIVER                    │`)
console.log(`│       4 │ AVANÇAR_2       │ ${ENTRY_VALUE_N10.toString().padStart(14)} │ → PERDIDO (não há N+1)                 │`)
console.log(`│       5 │ COMUNIDADE      │ ${ENTRY_VALUE_N10.toString().padStart(14)} │ → Distribuído (reserva/op/bonus/lucro) │`)
console.log(`│       6 │ REENTRADA       │ ${ENTRY_VALUE_N10.toString().padStart(14)} │ → Volta pro caixa do N10               │`)
console.log('└─────────┴─────────────────┴────────────────┴────────────────────────────────────────┘')
console.log('')

// Cálculo do balanço
const moneyIn = totalEntryPerCycle
const moneyToReceiver = ENTRY_VALUE_N10 * 2 // pos 1 + pos 3
const moneyLost = ENTRY_VALUE_N10 * 2 // pos 2 + pos 4 (não vai a lugar nenhum!)
const moneyToSystem = ENTRY_VALUE_N10 // pos 5
const moneyBackToCash = ENTRY_VALUE_N10 // pos 6
const moneyFromReceiverEntry = ENTRY_VALUE_N10 // pos 0 (entrada do receiver)

console.log('💡 BALANÇO DO CICLO NO NÍVEL 10:')
console.log('')
console.log(`   ENTRADAS NO CAIXA N10:`)
console.log(`   + $${totalEntryPerCycle} (7 participantes × $${ENTRY_VALUE_N10})`)
console.log('')
console.log(`   SAÍDAS DO CAIXA N10:`)
console.log(`   - $${moneyToReceiver} → RECEIVER (ganho)`)
console.log(`   - $${moneyLost} → PERDIDO (pos 2,4 iriam para N+1 que não existe)`)
console.log(`   - $${moneyToSystem} → Sistema (pos 5 distribui)`)
console.log(`   - $${moneyBackToCash} → Volta pro caixa (pos 6)`)
console.log('')

const netBalance = moneyIn - moneyToReceiver - moneyLost - moneyToSystem
console.log(`   SALDO LÍQUIDO: $${totalEntryPerCycle} - $${moneyToReceiver} - $${moneyLost} - $${moneyToSystem} = $${netBalance}`)
console.log('')

// ==========================================
// 2. PROBLEMA IDENTIFICADO!
// ==========================================

console.log('═'.repeat(100))
console.log('                    2. ⚠️  PROBLEMA CRÍTICO IDENTIFICADO!')
console.log('═'.repeat(100))
console.log('')

console.log('🚨 ALERTA: As posições AVANÇAR_1 e AVANÇAR_2 no nível 10:')
console.log('')
console.log('   No código atual (matrix.service.ts linhas 561-566):')
console.log('   ```')
console.log('   if (levelNumber < 10) {')
console.log('     await prisma.level.update({')
console.log('       where: { levelNumber: levelNumber + 1 },')
console.log('       data: { cashBalance: { increment: amount } },')
console.log('     })')
console.log('   }')
console.log('   ```')
console.log('')
console.log('   ❌ O dinheiro das posições 2 e 4 ($10.240 por ciclo) DESAPARECE!')
console.log('   ❌ Não vai para nenhum lugar - é um "vazamento" de dinheiro')
console.log('')

// ==========================================
// 3. IMPACTO NA SUSTENTABILIDADE
// ==========================================

console.log('═'.repeat(100))
console.log('                    3. IMPACTO NA SUSTENTABILIDADE')
console.log('═'.repeat(100))
console.log('')

// Simulação: quanto tempo até o caixa do N10 zerar?
console.log('📊 SIMULAÇÃO: Caixa do Nível 10 ao longo do tempo')
console.log('')

let cashBalance = 100000 // Supondo $100.000 inicial no caixa
const cyclesHistory: { cycle: number; cash: number; deficit: number }[] = []

// Por ciclo: entra 7 × 5120, sai receiver (10240) + perdido (10240) + sistema (5120)
// Mas o que reentra (pos 6) volta ao caixa
// Entrada líquida por ciclo = -$10.240 (o dinheiro perdido nas pos 2 e 4)

const deficitPerCycle = moneyLost // $10.240 perdidos por ciclo

for (let cycle = 1; cycle <= 20; cycle++) {
  cashBalance -= deficitPerCycle
  cyclesHistory.push({
    cycle,
    cash: Math.max(0, cashBalance),
    deficit: deficitPerCycle * cycle
  })
}

console.log('┌─────────┬────────────────────┬────────────────────┐')
console.log('│ Ciclo   │ Caixa N10 ($)      │ Déficit Acum. ($)  │')
console.log('├─────────┼────────────────────┼────────────────────┤')

for (const h of cyclesHistory.filter((_, i) => i % 2 === 0 || i === cyclesHistory.length - 1)) {
  console.log(`│ ${h.cycle.toString().padStart(7)} │ ${h.cash.toLocaleString('pt-BR').padStart(18)} │ ${h.deficit.toLocaleString('pt-BR').padStart(18)} │`)
}

console.log('└─────────┴────────────────────┴────────────────────┘')
console.log('')

const cyclesToBankrupt = Math.ceil(100000 / deficitPerCycle)
console.log(`⚠️ Com $100.000 no caixa, o nível 10 quebra em ~${cyclesToBankrupt} ciclos`)
console.log('')

// ==========================================
// 4. SOLUÇÕES POSSÍVEIS
// ==========================================

console.log('═'.repeat(100))
console.log('                    4. SOLUÇÕES POSSÍVEIS')
console.log('═'.repeat(100))
console.log('')

console.log('🔧 OPÇÃO A: Redirecionar dinheiro das posições 2 e 4 no N10')
console.log('   • Enviar para reserva do sistema')
console.log('   • Ou redistribuir para o caixa do N10')
console.log('   • Ou criar um "fundo de sustentabilidade"')
console.log('')

console.log('🔧 OPÇÃO B: Mudar comportamento no Nível 10')
console.log('   • Posições 2 e 4 também reentra no N10 (como pos 1, 3, 6)')
console.log('   • O dinheiro fica no caixa do N10')
console.log('')

console.log('🔧 OPÇÃO C: Criar saída natural do sistema')
console.log('   • Após X ciclos no N10, usuário "gradua" e sai')
console.log('   • Recebe um bônus final de graduação')
console.log('   • Libera espaço para novos usuários')
console.log('')

console.log('🔧 OPÇÃO D: Taxa de manutenção no N10')
console.log('   • Cada reentrada no N10 cobra pequena taxa')
console.log('   • Taxa financia a sustentabilidade')
console.log('')

// ==========================================
// 5. ANÁLISE COM CORREÇÃO
// ==========================================

console.log('═'.repeat(100))
console.log('                    5. ANÁLISE COM CORREÇÃO (Opção B)')
console.log('═'.repeat(100))
console.log('')

console.log('Se as posições 2 e 4 também reentrarem no N10 (não perderem dinheiro):')
console.log('')

const correctedMoneyIn = totalEntryPerCycle
const correctedMoneyOut = moneyToReceiver + moneyToSystem // Só receiver + comunidade
const correctedNetBalance = correctedMoneyIn - correctedMoneyOut - moneyBackToCash

console.log(`   ENTRADAS: $${correctedMoneyIn}`)
console.log(`   SAÍDAS: $${moneyToReceiver} (receiver) + $${moneyToSystem} (sistema) = $${moneyToReceiver + moneyToSystem}`)
console.log(`   REENTRADA: $${moneyBackToCash} (volta ao caixa)`)
console.log('')
console.log(`   SALDO: $${correctedMoneyIn} - $${correctedMoneyOut} = $${correctedNetBalance}`)
console.log('')

if (correctedNetBalance >= 0) {
  console.log('   ✅ SISTEMA SUSTENTÁVEL!')
  console.log(`   O caixa AUMENTA $${correctedNetBalance} por ciclo`)
} else {
  console.log('   ❌ SISTEMA AINDA DEFICITÁRIO')
}

// ==========================================
// 6. RECOMENDAÇÃO FINAL
// ==========================================

console.log('')
console.log('═'.repeat(100))
console.log('                    6. RECOMENDAÇÃO FINAL')
console.log('═'.repeat(100))
console.log('')

console.log('📋 ALTERAÇÃO NECESSÁRIA NO CÓDIGO:')
console.log('')
console.log('   No arquivo: src/services/matrix.service.ts')
console.log('   Função: processCycle()')
console.log('   Posições: ADVANCE_1 e ADVANCE_2')
console.log('')
console.log('   CÓDIGO ATUAL (problemático):')
console.log('   ```typescript')
console.log('   case \'ADVANCE_1\':')
console.log('   case \'ADVANCE_2\':')
console.log('     if (levelNumber < 10) {')
console.log('       await prisma.level.update({')
console.log('         where: { levelNumber: levelNumber + 1 },')
console.log('         data: { cashBalance: { increment: amount } },')
console.log('       })')
console.log('     }')
console.log('     // ❌ Se levelNumber === 10, dinheiro some!')
console.log('     break')
console.log('   ```')
console.log('')
console.log('   CÓDIGO CORRIGIDO:')
console.log('   ```typescript')
console.log('   case \'ADVANCE_1\':')
console.log('   case \'ADVANCE_2\':')
console.log('     if (levelNumber < 10) {')
console.log('       await prisma.level.update({')
console.log('         where: { levelNumber: levelNumber + 1 },')
console.log('         data: { cashBalance: { increment: amount } },')
console.log('       })')
console.log('     } else {')
console.log('       // ✅ No nível 10, dinheiro vai para reserva do sistema')
console.log('       await prisma.systemFunds.update({')
console.log('         where: { id: 1 },')
console.log('         data: { reserve: { increment: amount } },')
console.log('       })')
console.log('     }')
console.log('     break')
console.log('   ```')
console.log('')

console.log('💡 BENEFÍCIO DA CORREÇÃO:')
console.log('')
console.log('   • $10.240 por ciclo vai para RESERVA ao invés de desaparecer')
console.log('   • Reserva pode ser usada pelo Jupiter Pool para destravar níveis')
console.log('   • Sistema se torna 100% sustentável')
console.log('   • Nível 10 pode ciclar infinitamente sem quebrar')
console.log('')

// ==========================================
// 7. PROJEÇÃO COM MUITOS USUÁRIOS NO N10
// ==========================================

console.log('═'.repeat(100))
console.log('                    7. PROJEÇÃO: 10.000 USUÁRIOS NO NÍVEL 10')
console.log('═'.repeat(100))
console.log('')

const usersInN10 = 10000
const cyclesPerDay = Math.floor(usersInN10 / 7) // ~1428 ciclos/dia

console.log(`👥 Usuários no Nível 10: ${usersInN10.toLocaleString('pt-BR')}`)
console.log(`🔄 Ciclos possíveis/dia: ${cyclesPerDay.toLocaleString('pt-BR')}`)
console.log('')

// Com correção: cada ciclo gera $10.240 para reserva
const dailyReserveIncome = cyclesPerDay * (ENTRY_VALUE_N10 * 2) // pos 2 + pos 4
const dailyPayouts = cyclesPerDay * REWARD_VALUE_N10

console.log('COM A CORREÇÃO IMPLEMENTADA:')
console.log(`   📈 Reserva gerada/dia: $${dailyReserveIncome.toLocaleString('pt-BR')}`)
console.log(`   📤 Pagamentos/dia: $${dailyPayouts.toLocaleString('pt-BR')}`)
console.log('')

// Taxa de saída natural (posição COMUNIDADE)
const exitRate = 1/7 // 14.3% saem por ciclo
const dailyExits = Math.floor(cyclesPerDay * exitRate)
const avgCyclesBeforeExit = 7 // Em média, cada usuário cicla 7 vezes antes de sair

console.log('FLUXO DE SAÍDA NATURAL:')
console.log(`   🚪 Taxa de saída por ciclo: ${(exitRate * 100).toFixed(1)}% (posição COMUNIDADE)`)
console.log(`   👋 Saídas estimadas/dia: ~${dailyExits.toLocaleString('pt-BR')} usuários`)
console.log(`   🔄 Ciclos médios antes de sair: ~${avgCyclesBeforeExit}`)
console.log('')

console.log('═'.repeat(100))
console.log('')
