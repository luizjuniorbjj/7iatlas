// 7iATLAS - API de Dados Financeiros Admin
// Endpoint para visualizar faturamento da empresa
// Conforme 7iATLAS-DOCUMENTACAO-TECNICA.md

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

/*
DISTRIBUIÇÃO DO CICLO:

POSIÇÕES 2 E 4: Avançam para nível +1
├── Níveis 1-9: valor alimenta o próximo nível
└── Nível 10: NÃO TEM NÍVEL 11, então valor vai para LUCRO DA EMPRESA
    - Cada ciclo no nível 10 = 2 x $5120 = $10,240 de lucro extra

POSIÇÃO 5: Distribuição (100% do entry value)
├── 10% → RESERVA (fundo interno da empresa)
├── 10% → OPERACIONAL (custos empresa)
├── 40% → BÔNUS INDICAÇÃO (se tiver indicador)
└── 40% → LUCRO SISTEMA (sempre)

* Sem indicador = 40% bônus vai para lucro (total 80%)

JUPITER POOL (SEPARADO - 10% do ganho do RECEBEDOR):
├── Fonte: 10% de cada CYCLE_REWARD pago ao recebedor
├── Exemplo: Recebedor ganha $320, Jupiter Pool recebe $32 (10%)
└── Uso: Reserva de segurança para destravar níveis parados

FLUXO DE CADA CICLO:
- 7 pessoas participam
- Recebedor ganha 2x o valor (menos 10% que vai para Jupiter Pool)
- Posições 1 e 3: doam para o recebedor (já contabilizado no 2x)
- Posições 2 e 4: avançam nível (ou lucro empresa se nível 10)
- Posição 5: distribuição (10%+10%+40%+40%)
- Posição 6: valor volta ao caixa (reentrada automática)
*/

// GET /api/admin/financeiro - Dados financeiros da empresa
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Buscar níveis
    const levels = await prisma.level.findMany({
      select: {
        id: true,
        levelNumber: true,
        cashBalance: true,
        entryValue: true,
        rewardValue: true,
        totalUsers: true
      },
      orderBy: { levelNumber: 'asc' }
    })

    // Calcular dados por nível
    let totalVendasReais = 0
    let totalCotasVendidas = 0
    let totalCashBalance = 0

    const levelsData = await Promise.all(levels.map(async (l) => {
      const cotasNivel = await prisma.queueEntry.count({
        where: { levelId: l.id }
      })

      const entryValue = Number(l.entryValue)
      const vendasNivel = cotasNivel * entryValue
      const balance = Number(l.cashBalance)

      totalVendasReais += vendasNivel
      totalCotasVendidas += cotasNivel
      totalCashBalance += balance

      return {
        level: l.levelNumber,
        entryValue: entryValue,
        rewardValue: Number(l.rewardValue),
        cashBalance: balance,
        totalUsers: l.totalUsers,
        cotasVendidas: cotasNivel,
        vendasNivel: vendasNivel
      }
    }))

    // Recompensas pagas (CYCLE_REWARD) - vai para usuários
    const rewards = await prisma.transaction.aggregate({
      where: { type: 'CYCLE_REWARD' },
      _sum: { amount: true },
      _count: true
    })

    // Bônus de indicação (BONUS_REFERRAL) - vai para indicadores
    const bonuses = await prisma.transaction.aggregate({
      where: { type: 'BONUS_REFERRAL' },
      _sum: { amount: true },
      _count: true
    })

    // Saques (WITHDRAWAL)
    const withdrawals = await prisma.transaction.aggregate({
      where: { type: 'WITHDRAWAL' },
      _sum: { amount: true },
      _count: true
    })

    // Saldo total dos usuários
    const usersBalance = await prisma.user.aggregate({
      _sum: { balance: true },
      _count: true
    })

    // Total de cotas na fila (WAITING)
    const totalQuotasInQueue = await prisma.queueEntry.count({
      where: { status: 'WAITING' }
    })

    // Estatísticas de ciclos por nível
    const cycleStats = await prisma.levelStats.findMany({
      include: { level: true },
      orderBy: { level: { levelNumber: 'asc' } }
    })

    // Calcular totais
    const totalRewards = Number(rewards._sum.amount || 0)
    const totalBonus = Number(bonuses._sum.amount || 0)
    const totalWithdrawals = Number(withdrawals._sum.amount || 0)
    const totalSaldos = Number(usersBalance._sum.balance || 0)
    const totalCiclos = rewards._count || 0

    /*
    CÁLCULO DOS GANHOS DA EMPRESA:

    POSIÇÃO 5 (distribui o entry value):
    - 10% Reserva (fundo interno empresa)
    - 10% Operacional (custos)
    - 40% Bônus (se tiver indicador) ou Lucro (se não tiver)
    - 40% Lucro garantido

    JUPITER POOL (separado):
    - 10% de cada CYCLE_REWARD pago ao recebedor
    - É uma reserva de segurança, não vai direto para lucro

    NÍVEL 10 - Posições 2 e 4:
    - Não têm próximo nível, então vai para lucro da empresa
    */

    // Calcular receita da posição 5 por nível
    let totalPosicao5 = 0
    let totalReserva = 0      // 10% da posição 5
    let totalOperacional = 0  // 10% da posição 5
    let totalLucroSistema = 0 // 40% garantido da posição 5
    let totalJupiterPool = 0  // 10% do ganho do recebedor (SEPARADO)
    let totalPos24Nivel10 = 0 // Posições 2 e 4 do nível 10 (sem avanço = lucro)
    let ciclosNivel10 = 0

    // Estimar baseado nos ciclos de cada nível
    for (const nivel of levelsData) {
      // Buscar quantos ciclos houve neste nível (baseado em transações CYCLE_REWARD com esse valor)
      const rewardValue = nivel.rewardValue
      const ciclosNivel = await prisma.transaction.count({
        where: {
          type: 'CYCLE_REWARD',
          amount: rewardValue
        }
      })

      // Valor da posição 5 = entry value do nível
      const valorPosicao5 = nivel.entryValue * ciclosNivel
      totalPosicao5 += valorPosicao5

      // Distribuição da Posição 5
      totalReserva += valorPosicao5 * 0.10
      totalOperacional += valorPosicao5 * 0.10
      totalLucroSistema += valorPosicao5 * 0.40

      // Jupiter Pool = 10% do ganho do RECEBEDOR (reward value)
      // Exemplo: Recebedor ganha $320, Jupiter Pool recebe $32
      totalJupiterPool += nivel.rewardValue * ciclosNivel * 0.10

      // NÍVEL 10: Posições 2 e 4 não têm para onde avançar = LUCRO EMPRESA
      // Cada ciclo no nível 10 gera 2 x entry value ($5120) = $10,240 de lucro extra
      if (nivel.level === 10) {
        ciclosNivel10 = ciclosNivel
        totalPos24Nivel10 = ciclosNivel * nivel.entryValue * 2 // 2 posições x entry value
      }
    }

    // Bônus não pago = diferença entre 40% potencial e bônus efetivamente pago
    // Se totalBonus < 40% de totalPosicao5, a diferença foi para lucro
    const bonusPotencial = totalPosicao5 * 0.40
    const bonusNaoPago = Math.max(0, bonusPotencial - totalBonus)

    // Receita Total da Empresa:
    // - Reserva (10% da posição 5)
    // - Operacional (10% da posição 5)
    // - Lucro Garantido (40% da posição 5)
    // - Bônus Não Pago (40% quando não tem indicador)
    // - Posições 2 e 4 do Nível 10 (2 x $5120 por ciclo - sem avanço = lucro)
    const receitaTotalEmpresa = totalReserva + totalOperacional + totalLucroSistema + bonusNaoPago + totalPos24Nivel10

    return NextResponse.json({
      // Resumo geral
      resumo: {
        totalEntradas: totalVendasReais,
        totalSaidas: totalRewards + totalBonus,
        totalCashBalance,
        totalSaldoUsuarios: totalSaldos,
        totalUsuarios: usersBalance._count,
        totalQuotasInQueue,
        totalCotasVendidas,
        totalCiclos
      },
      // Receitas da empresa (posição 5)
      receitaEmpresa: {
        posicao5Total: totalPosicao5,
        reserva: {
          valor: totalReserva,
          percentual: 10,
          descricao: 'Fundo de reserva interno (10% pos 5)'
        },
        operacional: {
          valor: totalOperacional,
          percentual: 10,
          descricao: 'Custos operacionais (10% pos 5)'
        },
        lucroGarantido: {
          valor: totalLucroSistema,
          percentual: 40,
          descricao: 'Lucro garantido (40% pos 5)'
        },
        bonusPago: {
          valor: totalBonus,
          quantidade: bonuses._count,
          descricao: 'Bonus pagos a indicadores'
        },
        bonusNaoPago: {
          valor: bonusNaoPago,
          descricao: 'Bonus nao pago (sem indicador) = lucro'
        },
        pos24Nivel10: {
          valor: totalPos24Nivel10,
          ciclos: ciclosNivel10,
          descricao: 'Pos 2/4 Nivel 10 (sem avanco = lucro)'
        },
        receitaTotal: {
          valor: receitaTotalEmpresa,
          descricao: 'Reserva + Operac + Lucro + Bonus NP + Pos2/4 N10'
        }
      },
      // Jupiter Pool (SEPARADO - 10% do ganho do recebedor)
      jupiterPool: {
        valor: totalJupiterPool,
        percentual: 10,
        descricao: '10% do ganho do recebedor (reserva anti-travamento)',
        ciclos: totalCiclos
      },
      // Entradas (vendas)
      entradas: {
        vendaCotas: {
          total: totalVendasReais,
          quantidade: totalCotasVendidas
        }
      },
      // Saídas para usuários
      saidas: {
        recompensas: {
          total: totalRewards,
          quantidade: rewards._count,
          descricao: 'Pagamentos aos recebedores (2x valor)'
        },
        bonus: {
          total: totalBonus,
          quantidade: bonuses._count,
          descricao: 'Bônus de indicação (40% posição 5)'
        },
        saques: {
          total: totalWithdrawals,
          quantidade: withdrawals._count
        }
      },
      // Dados por nível
      niveis: levelsData,
      // Estatísticas de ciclos
      ciclos: cycleStats.map(s => ({
        nivel: s.level.levelNumber,
        totalCiclos: s.totalCycles,
        ciclosHoje: s.cyclesToday,
        mediaDiaria: Number(s.avgCyclesPerDay)
      }))
    })
  } catch (error: any) {
    console.error('Erro ao buscar dados financeiros:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
