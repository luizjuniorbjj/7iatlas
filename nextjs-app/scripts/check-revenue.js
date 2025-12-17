const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('========================================');
  console.log('=== RELATORIO FINANCEIRO 7iATLAS ===');
  console.log('========================================\n');

  // Vendas de cotas (ENTRADA DE DINHEIRO)
  const quotaSales = await prisma.transaction.aggregate({
    where: { type: 'QUOTA_PURCHASE' },
    _sum: { amount: true },
    _count: true
  });
  console.log('=== ENTRADAS ===');
  console.log('Vendas de Cotas:', quotaSales._sum.amount?.toString() || '0');
  console.log('Quantidade de cotas vendidas:', quotaSales._count);

  // Depósitos
  const deposits = await prisma.transaction.aggregate({
    where: { type: 'DEPOSIT' },
    _sum: { amount: true },
    _count: true
  });
  console.log('Depositos:', deposits._sum.amount?.toString() || '0');

  // Recompensas pagas (SAÍDA DE DINHEIRO)
  const rewards = await prisma.transaction.aggregate({
    where: { type: 'CYCLE_REWARD' },
    _sum: { amount: true },
    _count: true
  });
  console.log('\n=== SAIDAS ===');
  console.log('Recompensas (CYCLE_REWARD):', rewards._sum.amount?.toString() || '0');
  console.log('Quantidade de ciclos:', rewards._count);

  // Bônus de indicação
  const bonuses = await prisma.transaction.aggregate({
    where: { type: 'BONUS_REFERRAL' },
    _sum: { amount: true },
    _count: true
  });
  console.log('Bonus Indicacao:', bonuses._sum.amount?.toString() || '0');
  console.log('Quantidade de bonus:', bonuses._count);

  // Saques
  const withdrawals = await prisma.transaction.aggregate({
    where: { type: 'WITHDRAWAL' },
    _sum: { amount: true },
    _count: true
  });
  console.log('Saques:', withdrawals._sum.amount?.toString() || '0');

  // Caixa dos níveis
  const levels = await prisma.level.findMany({
    select: { levelNumber: true, cashBalance: true, entryValue: true }
  });
  let totalCashBalance = 0;
  console.log('\n=== CAIXA DOS NIVEIS ===');
  levels.forEach(l => {
    const balance = Number(l.cashBalance);
    console.log(`Nivel ${l.levelNumber} ($${l.entryValue}): $${balance.toLocaleString()}`);
    totalCashBalance += balance;
  });
  console.log('TOTAL em caixa:', totalCashBalance.toLocaleString());

  // Saldo total dos usuários
  const usersBalance = await prisma.user.aggregate({
    _sum: { balance: true },
    _count: true
  });
  console.log('\n=== USUARIOS ===');
  console.log('Total usuarios:', usersBalance._count);
  console.log('Saldo total usuarios:', usersBalance._sum.balance?.toString() || '0');

  // Resumo financeiro
  const totalVendas = Number(quotaSales._sum.amount || 0);
  const totalDeposits = Number(deposits._sum.amount || 0);
  const totalRewards = Number(rewards._sum.amount || 0);
  const totalBonus = Number(bonuses._sum.amount || 0);
  const totalWithdrawals = Number(withdrawals._sum.amount || 0);
  const totalSaldos = Number(usersBalance._sum.balance || 0);

  const totalEntradas = totalVendas + totalDeposits;
  const totalSaidas = totalRewards + totalBonus + totalWithdrawals;

  console.log('\n========================================');
  console.log('=== RESUMO FINANCEIRO ===');
  console.log('========================================');
  console.log('TOTAL ENTRADAS:', totalEntradas.toLocaleString());
  console.log('  - Vendas de cotas:', totalVendas.toLocaleString());
  console.log('  - Depositos:', totalDeposits.toLocaleString());
  console.log('');
  console.log('TOTAL SAIDAS:', totalSaidas.toLocaleString());
  console.log('  - Recompensas ciclos:', totalRewards.toLocaleString());
  console.log('  - Bonus indicacao:', totalBonus.toLocaleString());
  console.log('  - Saques:', totalWithdrawals.toLocaleString());
  console.log('');
  console.log('RETIDO NOS CAIXAS:', totalCashBalance.toLocaleString());
  console.log('SALDO USUARIOS:', totalSaldos.toLocaleString());
  console.log('----------------------------------------');
  console.log('LUCRO BRUTO EMPRESA:', (totalEntradas - totalSaidas).toLocaleString());
  console.log('========================================');

  await prisma.$disconnect();
}

check().catch(console.error);
