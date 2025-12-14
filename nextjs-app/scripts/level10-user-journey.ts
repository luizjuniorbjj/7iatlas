/**
 * 7iATLAS - Simulação Prática: SUA JORNADA NO NÍVEL 10
 *
 * Exemplo real de como seria para VOCÊ no nível 10
 *
 * Execução: npx ts-node --transpile-only scripts/level10-user-journey.ts
 */

console.log('')
console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════╗')
console.log('║              🎮 SUA JORNADA NO NÍVEL 10 - SIMULAÇÃO PRÁTICA                                  ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝')
console.log('')

// Configurações
const ENTRY_VALUE = 5120
const REWARD_VALUE = 10240
const POSITIONS = ['RECEIVER', 'DOAR_1', 'AVANÇAR_1', 'DOAR_2', 'AVANÇAR_2', 'COMUNIDADE', 'REENTRADA']

// ==========================================
// CENÁRIO: VOCÊ ACABOU DE CHEGAR NO NÍVEL 10!
// ==========================================

console.log('═'.repeat(100))
console.log('   🎉 PARABÉNS! VOCÊ ACABOU DE CHEGAR NO NÍVEL 10!')
console.log('═'.repeat(100))
console.log('')

console.log('   📊 SEU STATUS:')
console.log('   ┌─────────────────────────────────────────────────────────────┐')
console.log('   │ Usuário: VOCÊ                                               │')
console.log('   │ Nível atual: 10 (MÁXIMO!)                                   │')
console.log(`   │ Valor de entrada: $${ENTRY_VALUE}                                    │`)
console.log(`   │ Ganho quando RECEIVER: $${REWARD_VALUE} (2x)                          │`)
console.log('   │ Status: NA FILA - Aguardando ciclo                          │')
console.log('   └─────────────────────────────────────────────────────────────┘')
console.log('')

// ==========================================
// SIMULAÇÃO DE 20 CICLOS NO NÍVEL 10
// ==========================================

console.log('═'.repeat(100))
console.log('   🎲 SIMULAÇÃO: SEUS PRÓXIMOS 20 CICLOS NO NÍVEL 10')
console.log('═'.repeat(100))
console.log('')

// Simular posições aleatórias (mas realistas)
function getRandomPosition(): number {
  return Math.floor(Math.random() * 7)
}

interface CycleResult {
  cycle: number
  position: number
  positionName: string
  action: string
  earned: number
  status: string
}

const results: CycleResult[] = []
let totalEarned = 0
let cycleCount = 0
let receiverCount = 0
let stillInSystem = true

console.log('┌────────┬─────────────────┬─────────────────────────────────────────────────┬────────────┬──────────────┐')
console.log('│ Ciclo  │ Posição         │ O que acontece                                  │ Ganho ($)  │ Total Acum.  │')
console.log('├────────┼─────────────────┼─────────────────────────────────────────────────┼────────────┼──────────────┤')

while (stillInSystem && cycleCount < 20) {
  cycleCount++
  const position = getRandomPosition()
  const positionName = POSITIONS[position]

  let action = ''
  let earned = 0
  let status = ''

  switch (position) {
    case 0: // RECEIVER
      earned = REWARD_VALUE
      totalEarned += earned
      receiverCount++
      action = `🎉 GANHOU $${REWARD_VALUE}! Reentra na fila`
      status = '✅ Continua'
      break

    case 1: // DOAR_1
      action = 'Doou para RECEIVER. Reentra na fila'
      status = '🔄 Continua'
      break

    case 2: // AVANÇAR_1
      action = '⚠️ Valor iria p/ N11 (não existe). Reentra'
      status = '🔄 Continua'
      break

    case 3: // DOAR_2
      action = 'Doou para RECEIVER. Reentra na fila'
      status = '🔄 Continua'
      break

    case 4: // AVANÇAR_2
      action = '⚠️ Valor iria p/ N11 (não existe). Reentra'
      status = '🔄 Continua'
      break

    case 5: // COMUNIDADE
      action = '🚪 SAI DO SISTEMA! Valor distribuído'
      status = '❌ SAIU'
      stillInSystem = false
      break

    case 6: // REENTRADA
      action = 'Valor volta ao caixa. Reentra na fila'
      status = '🔄 Continua'
      break
  }

  results.push({
    cycle: cycleCount,
    position,
    positionName,
    action,
    earned,
    status,
  })

  const earnedStr = earned > 0 ? `+$${earned.toLocaleString('pt-BR')}` : '-'
  const totalStr = `$${totalEarned.toLocaleString('pt-BR')}`

  console.log(`│ ${cycleCount.toString().padStart(6)} │ ${positionName.padEnd(15)} │ ${action.padEnd(47)} │ ${earnedStr.padStart(10)} │ ${totalStr.padStart(12)} │`)

  if (!stillInSystem) {
    console.log('├────────┴─────────────────┴─────────────────────────────────────────────────┴────────────┴──────────────┤')
    console.log(`│ 🚪 VOCÊ SAIU DO SISTEMA NA POSIÇÃO COMUNIDADE!                                                         │`)
    console.log('└────────────────────────────────────────────────────────────────────────────────────────────────────────┘')
  }
}

if (stillInSystem) {
  console.log('├────────┴─────────────────┴─────────────────────────────────────────────────┴────────────┴──────────────┤')
  console.log(`│ ⏳ Simulação parou em 20 ciclos - você ainda está no sistema!                                           │`)
  console.log('└────────────────────────────────────────────────────────────────────────────────────────────────────────┘')
}

// ==========================================
// RESUMO DA SUA JORNADA
// ==========================================

console.log('')
console.log('═'.repeat(100))
console.log('   📊 RESUMO DA SUA JORNADA NO NÍVEL 10')
console.log('═'.repeat(100))
console.log('')

console.log(`   🔄 Ciclos participados: ${cycleCount}`)
console.log(`   🎉 Vezes como RECEIVER: ${receiverCount}`)
console.log(`   💰 Total ganho: $${totalEarned.toLocaleString('pt-BR')}`)
console.log(`   📊 Status final: ${stillInSystem ? 'Ainda no sistema' : 'Saiu (posição COMUNIDADE)'}`)
console.log('')

// ==========================================
// ANÁLISE: E SE VOCÊ NÃO TIVESSE SAÍDO?
// ==========================================

console.log('═'.repeat(100))
console.log('   🔮 PROJEÇÃO: SE VOCÊ FICASSE 100 CICLOS NO N10')
console.log('═'.repeat(100))
console.log('')

// Probabilidades
const pReceiver = 1/7 // 14.3%
const pExit = 1/7 // 14.3%

// Simulação Monte Carlo (1000 usuários)
const simulations = 1000
let totalCyclesAllUsers = 0
let totalEarnedAllUsers = 0
let totalReceiverAllUsers = 0

for (let sim = 0; sim < simulations; sim++) {
  let inSystem = true
  let cycles = 0
  let earned = 0
  let receivers = 0

  while (inSystem && cycles < 100) {
    cycles++
    const pos = Math.floor(Math.random() * 7)

    if (pos === 0) { // RECEIVER
      earned += REWARD_VALUE
      receivers++
    } else if (pos === 5) { // COMUNIDADE
      inSystem = false
    }
  }

  totalCyclesAllUsers += cycles
  totalEarnedAllUsers += earned
  totalReceiverAllUsers += receivers
}

const avgCycles = totalCyclesAllUsers / simulations
const avgEarned = totalEarnedAllUsers / simulations
const avgReceivers = totalReceiverAllUsers / simulations

console.log(`   📊 Baseado em ${simulations} simulações:`)
console.log('')
console.log(`   • Ciclos médios antes de sair: ${avgCycles.toFixed(1)}`)
console.log(`   • Vezes como RECEIVER (média): ${avgReceivers.toFixed(1)}`)
console.log(`   • Ganho médio total: $${avgEarned.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`)
console.log('')

// ==========================================
// TABELA DE PROBABILIDADES
// ==========================================

console.log('═'.repeat(100))
console.log('   📈 PROBABILIDADES NO NÍVEL 10')
console.log('═'.repeat(100))
console.log('')

console.log('   A cada ciclo que você participa:')
console.log('')
console.log('   ┌─────────────────────┬──────────────┬─────────────────────────────────────────────┐')
console.log('   │ Posição             │ Chance       │ O que acontece                              │')
console.log('   ├─────────────────────┼──────────────┼─────────────────────────────────────────────┤')
console.log('   │ 🎉 RECEIVER         │ 14.3% (1/7)  │ GANHA $10.240 + reentra                     │')
console.log('   │ 💸 DOAR_1           │ 14.3% (1/7)  │ Doa para receiver + reentra                 │')
console.log('   │ ⚠️  AVANÇAR_1        │ 14.3% (1/7)  │ Dinheiro "perdido" + reentra                │')
console.log('   │ 💸 DOAR_2           │ 14.3% (1/7)  │ Doa para receiver + reentra                 │')
console.log('   │ ⚠️  AVANÇAR_2        │ 14.3% (1/7)  │ Dinheiro "perdido" + reentra                │')
console.log('   │ 🚪 COMUNIDADE       │ 14.3% (1/7)  │ SAI DO SISTEMA (fim da jornada)             │')
console.log('   │ 🔄 REENTRADA        │ 14.3% (1/7)  │ Dinheiro volta ao caixa + reentra           │')
console.log('   └─────────────────────┴──────────────┴─────────────────────────────────────────────┘')
console.log('')

// ==========================================
// O PROBLEMA DO CICLO PERPÉTUO
// ==========================================

console.log('═'.repeat(100))
console.log('   ⚠️ O PROBLEMA: CICLO QUASE PERPÉTUO')
console.log('═'.repeat(100))
console.log('')

console.log('   SITUAÇÃO ATUAL:')
console.log('   • 6 em 7 posições fazem você REENTRAR (85.7%)')
console.log('   • Apenas 1 posição faz você SAIR (14.3%)')
console.log('')
console.log('   CONSEQUÊNCIA:')
console.log('   • Usuários ficam "presos" no N10 por muitos ciclos')
console.log('   • Em média, ~7 ciclos antes de sair')
console.log('   • Alguns usuários podem ficar 20, 30, 50+ ciclos!')
console.log('')
console.log('   IMPACTO NO SISTEMA:')
console.log('   • N10 vai ACUMULANDO usuários')
console.log('   • Fila cresce indefinidamente')
console.log('   • Tempo de espera aumenta')
console.log('')

// ==========================================
// EXEMPLO VISUAL: FILA DO N10
// ==========================================

console.log('═'.repeat(100))
console.log('   👥 EXEMPLO: COMO A FILA DO N10 CRESCE')
console.log('═'.repeat(100))
console.log('')

console.log('   DIA 1: 100 usuários chegam no N10')
console.log('   ┌──────────────────────────────────────────────────────────────────────────────┐')
console.log('   │ [👤][👤][👤][👤][👤][👤][👤][👤][👤][👤]... (100 na fila)                   │')
console.log('   └──────────────────────────────────────────────────────────────────────────────┘')
console.log('')

console.log('   DIA 1: Processamos 14 ciclos (100 ÷ 7)')
console.log('   • 14 usuários saem (posição COMUNIDADE)')
console.log('   • 84 usuários reentraram')
console.log('   • 2 ficaram (fila incompleta)')
console.log('')

console.log('   DIA 2: +50 novos usuários chegam')
console.log('   ┌──────────────────────────────────────────────────────────────────────────────┐')
console.log('   │ [👤][👤][👤]... (86 antigos + 50 novos = 136 na fila)                        │')
console.log('   └──────────────────────────────────────────────────────────────────────────────┘')
console.log('')

console.log('   E ASSIM VAI CRESCENDO...')
console.log('')

// ==========================================
// SOLUÇÃO PROPOSTA
// ==========================================

console.log('═'.repeat(100))
console.log('   💡 SOLUÇÃO: O QUE DEVERIA ACONTECER')
console.log('═'.repeat(100))
console.log('')

console.log('   OPÇÃO HÍBRIDA (50/50):')
console.log('')
console.log('   Quando você é RECEIVER no N10:')
console.log('   ┌───────────────────────────────────────────────────────────────────────────┐')
console.log('   │ Ganho atual:     $10.240 (2x)                                             │')
console.log('   │ Bônus extra:    +$5.120 (das posições 2 e 4)                              │')
console.log('   │ NOVO TOTAL:      $15.360 (3x) 🎉                                          │')
console.log('   └───────────────────────────────────────────────────────────────────────────┘')
console.log('')

console.log('   O outro 50% ($5.120) vai para RESERVA do sistema')
console.log('   → Alimenta o Jupiter Pool')
console.log('   → Ajuda a destravar níveis')
console.log('')

// ==========================================
// COMPARATIVO FINAL
// ==========================================

console.log('═'.repeat(100))
console.log('   📊 COMPARATIVO: SISTEMA ATUAL vs CORRIGIDO')
console.log('═'.repeat(100))
console.log('')

console.log('   ┌─────────────────────────────────┬─────────────────────┬─────────────────────┐')
console.log('   │ Métrica                         │ Sistema ATUAL       │ Sistema CORRIGIDO   │')
console.log('   ├─────────────────────────────────┼─────────────────────┼─────────────────────┤')
console.log('   │ Ganho RECEIVER no N10           │ $10.240 (2x)        │ $15.360 (3x) ⬆️     │')
console.log('   │ Dinheiro das pos 2,4            │ PERDIDO ❌          │ 50% receiver/reserva │')
console.log('   │ Reserva do sistema              │ Não alimentada      │ +$5.120/ciclo ⬆️    │')
console.log('   │ Sustentabilidade                │ Quebra em ~10 ciclos│ Infinita ✅         │')
console.log('   └─────────────────────────────────┴─────────────────────┴─────────────────────┘')
console.log('')

console.log('═'.repeat(100))
console.log('   🎯 CONCLUSÃO: Com a correção, você ganharia 50% A MAIS como RECEIVER!')
console.log('═'.repeat(100))
console.log('')
