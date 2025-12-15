// 7iATLAS - Dados de Demonstração
// Permite rodar o dashboard sem banco de dados real

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// Usuário demo
export const demoUser = {
  id: 'demo-user-001',
  email: 'demo@7iatlas.ai',
  walletAddress: '0x75d1a8ac59003088c60a20bde8953cbecfe41669',
  name: 'Luiz Paulo',
  referralCode: 'DEMO7I',
  status: 'ACTIVE' as const,
  currentLevel: 3,
  totalDeposited: 70,
  totalEarned: 126,
  totalBonus: 28.80,
  totalWithdrawn: 0,
  balance: 154.80,
  createdAt: new Date('2024-12-01'),
  activatedAt: new Date('2024-12-01'),
}

// Stats do usuário demo
export const demoStats = {
  balance: 154.80,
  totalEarned: 126,
  totalBonus: 28.80,
  referralsCount: 7,
  cyclesCompleted: 5,
  queuePosition: 23,
  totalInQueue: 156,
}

// Níveis do sistema
export const demoLevels = [
  { levelNumber: 1, entryValue: 10, rewardValue: 20, bonusValue: 4, cashBalance: 1540, totalCycles: 154, totalUsers: 892 },
  { levelNumber: 2, entryValue: 20, rewardValue: 40, bonusValue: 8, cashBalance: 980, totalCycles: 67, totalUsers: 445 },
  { levelNumber: 3, entryValue: 40, rewardValue: 80, bonusValue: 16, cashBalance: 520, totalCycles: 34, totalUsers: 223 },
  { levelNumber: 4, entryValue: 80, rewardValue: 160, bonusValue: 32, cashBalance: 400, totalCycles: 18, totalUsers: 112 },
  { levelNumber: 5, entryValue: 160, rewardValue: 320, bonusValue: 64, cashBalance: 320, totalCycles: 9, totalUsers: 56 },
  { levelNumber: 6, entryValue: 320, rewardValue: 640, bonusValue: 128, cashBalance: 640, totalCycles: 5, totalUsers: 28 },
  { levelNumber: 7, entryValue: 640, rewardValue: 1280, bonusValue: 256, cashBalance: 1280, totalCycles: 3, totalUsers: 14 },
  { levelNumber: 8, entryValue: 1280, rewardValue: 2560, bonusValue: 512, cashBalance: 2560, totalCycles: 2, totalUsers: 7 },
  { levelNumber: 9, entryValue: 2560, rewardValue: 5120, bonusValue: 1024, cashBalance: 5120, totalCycles: 1, totalUsers: 4 },
  { levelNumber: 10, entryValue: 5120, rewardValue: 10240, bonusValue: 2048, cashBalance: 10240, totalCycles: 0, totalUsers: 2 },
]

// Cotas do usuário
export const demoQuotas = [
  { level: 1, count: 2, quotas: [
    { id: 'q1', quotaNumber: 1, status: 'COMPLETED', score: 156, reentries: 3, enteredAt: new Date('2024-12-01'), processedAt: new Date('2024-12-05') },
    { id: 'q2', quotaNumber: 2, status: 'WAITING', score: 89, reentries: 1, enteredAt: new Date('2024-12-10') },
  ]},
  { level: 2, count: 1, quotas: [
    { id: 'q3', quotaNumber: 1, status: 'WAITING', score: 67, reentries: 0, enteredAt: new Date('2024-12-08') },
  ]},
  { level: 3, count: 1, quotas: [
    { id: 'q4', quotaNumber: 1, status: 'WAITING', score: 45, reentries: 0, enteredAt: new Date('2024-12-12') },
  ]},
]

// Indicados do usuário
export const demoReferrals = [
  { id: 'r1', name: 'Maria Santos', walletAddress: '0x123...abc', status: 'ACTIVE', currentLevel: 2, createdAt: '2024-12-02', totalBonus: 12 },
  { id: 'r2', name: 'João Silva', walletAddress: '0x456...def', status: 'ACTIVE', currentLevel: 1, createdAt: '2024-12-03', totalBonus: 4 },
  { id: 'r3', name: 'Ana Costa', walletAddress: '0x789...ghi', status: 'ACTIVE', currentLevel: 3, createdAt: '2024-12-04', totalBonus: 8.80 },
  { id: 'r4', name: 'Pedro Lima', walletAddress: '0xabc...jkl', status: 'ACTIVE', currentLevel: 1, createdAt: '2024-12-05', totalBonus: 4 },
  { id: 'r5', name: 'Carlos Souza', walletAddress: '0xdef...mno', status: 'PENDING', currentLevel: 1, createdAt: '2024-12-10', totalBonus: 0 },
  { id: 'r6', name: 'Lucia Ferreira', walletAddress: '0xghi...pqr', status: 'ACTIVE', currentLevel: 2, createdAt: '2024-12-11', totalBonus: 0 },
  { id: 'r7', name: 'Roberto Alves', walletAddress: '0xjkl...stu', status: 'ACTIVE', currentLevel: 1, createdAt: '2024-12-12', totalBonus: 0 },
]

// Jupiter Pool
export const demoJupiterPool = {
  balance: 15420.50,
  totalDeposits: 25000,
  totalWithdrawals: 9579.50,
  todayDeposits: 320,
  todayWithdrawals: 70,
}

// Atividades recentes
export const demoActivities = [
  { id: '1', type: 'cycle', title: 'Ciclo Completado - Nível 3', amount: 72, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: '2', type: 'bonus', title: 'Bônus - Maria Santos ciclou', amount: 14.40, timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) },
  { id: '3', type: 'referral', title: 'Novo indicado - Roberto Alves', status: 'Ativo', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: '4', type: 'cycle', title: 'Ciclo Completado - Nível 2', amount: 36, timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: '5', type: 'bonus', title: 'Bônus - Pedro Costa ciclou', amount: 7.20, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
]

// Transferências
export const demoTransfers = [
  { id: 't1', type: 'sent', toUser: 'João Silva', amount: 20, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  { id: 't2', type: 'received', fromUser: 'Maria Santos', amount: 50, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
]

// Notificações
export const demoNotifications = [
  { id: 'n1', title: 'Ciclo Completado!', body: 'Você completou um ciclo no Nível 3 e ganhou $72', event: 'CYCLE_COMPLETED', read: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: 'n2', title: 'Bônus Recebido!', body: 'Maria Santos ciclou e você ganhou $14.40 de bônus', event: 'BONUS_RECEIVED', read: false, createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
  { id: 'n3', title: 'Novo Indicado!', body: 'Roberto Alves se cadastrou com seu link', event: 'REFERRAL', read: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
]

// Fila do nível atual
export const demoQueue = [
  { position: 1, name: 'Anônimo', score: 234, wallet: '0x1a2...3b4' },
  { position: 2, name: 'Carlos M.', score: 198, wallet: '0x5c6...7d8' },
  { position: 3, name: 'Anônimo', score: 187, wallet: '0x9e0...1f2' },
  { position: 4, name: 'Julia S.', score: 176, wallet: '0x3g4...5h6' },
  { position: 5, name: 'Anônimo', score: 165, wallet: '0x7i8...9j0' },
  // ... usuário demo está na posição 23
]

// Token de demo (JWT fake)
export const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZW1vLXVzZXItMDAxIiwiZW1haWwiOiJkZW1vQDdpYXRsYXMuYWkiLCJpYXQiOjE3MDI0MjQ4MDAsImV4cCI6MTc5OTAyNDgwMH0.demo_signature_for_testing_purposes_only'

// Função para verificar se é modo demo
export function isDemoMode(): boolean {
  return DEMO_MODE || process.env.NODE_ENV === 'development'
}

// Função para obter bônus tier info
export function getDemoBonusTier(referralsCount: number) {
  const active = demoReferrals.filter(r => r.status === 'ACTIVE').length
  if (active >= 10) {
    return { percent: 40, label: '40%', nextTier: null }
  } else if (active >= 5) {
    return { percent: 20, label: '20%', nextTier: { needed: 10 - active, percent: 40 } }
  }
  return { percent: 0, label: '0%', nextTier: { needed: 5 - active, percent: 20 } }
}
