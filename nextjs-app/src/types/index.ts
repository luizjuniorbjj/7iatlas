// 7iATLAS - Tipos TypeScript

// ==========================================
// USER TYPES
// ==========================================

export interface User {
  id: string
  email?: string
  walletAddress: string
  name?: string
  referralCode: string
  referrerId?: string
  status: UserStatus
  currentLevel: number
  totalDeposited: number
  totalEarned: number
  totalBonus: number
  totalWithdrawn: number
  createdAt: Date
  activatedAt?: Date
}

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'

export interface UserStats {
  balance: number
  bonus: number
  level: number
  position: number
  referralsCount: number
  cyclesCompleted: number
}

// ==========================================
// LEVEL TYPES
// ==========================================

export interface Level {
  id: number
  levelNumber: number
  entryValue: number
  rewardValue: number
  bonusValue: number
  cashBalance: number
  totalCycles: number
  totalUsers: number
}

// ==========================================
// QUEUE TYPES
// ==========================================

export interface QueueEntry {
  id: string
  userId: string
  levelId: number
  position: number
  score: number
  reentries: number
  status: QueueStatus
  enteredAt: Date
  processedAt?: Date
}

export type QueueStatus = 'WAITING' | 'PROCESSING' | 'COMPLETED'

export interface QueueInfo {
  level: number
  totalInQueue: number
  userPosition?: number
  estimatedTime?: string
  cashBalance: number
}

// ==========================================
// TRANSACTION TYPES
// ==========================================

export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  txHash?: string
  fromAddress?: string
  toAddress?: string
  status: TransactionStatus
  description?: string
  createdAt: Date
  confirmedAt?: Date
}

export type TransactionType = 'DEPOSIT' | 'CYCLE_REWARD' | 'BONUS_REFERRAL' | 'WITHDRAWAL'
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED'

// ==========================================
// CYCLE TYPES
// ==========================================

export interface CycleHistory {
  id: string
  userId: string
  levelId: number
  position: CyclePosition
  amount: number
  txHash?: string
  status: TransactionStatus
  cycleGroupId?: string
  createdAt: Date
  confirmedAt?: Date
}

export type CyclePosition =
  | 'RECEIVER'    // Posição 0 - Recebedor (ganha 2x)
  | 'DONATE_1'    // Posição 1 - Doa para recebedor
  | 'ADVANCE_1'   // Posição 2 - Avança para próximo nível
  | 'DONATE_2'    // Posição 3 - Doa para recebedor
  | 'ADVANCE_2'   // Posição 4 - Avança para próximo nível
  | 'COMMUNITY'   // Posição 5 - Distribuição comunitária
  | 'REENTRY'     // Posição 6 - Reentrada no mesmo nível

// ==========================================
// BONUS TYPES
// ==========================================

export interface BonusHistory {
  id: string
  referrerId: string
  referredId: string
  levelId: number
  amount: number
  txHash?: string
  status: TransactionStatus
  createdAt: Date
  confirmedAt?: Date
}

// ==========================================
// REFERRAL TYPES
// ==========================================

export interface Referral {
  id: string
  name?: string
  email?: string
  walletAddress: string
  status: UserStatus
  currentLevel: number
  totalBonus: number
  createdAt: Date
}

// ==========================================
// AUTH TYPES
// ==========================================

export interface LoginCredentials {
  email: string
  password: string
}

export interface WalletLoginCredentials {
  walletAddress: string
  signature: string
  message: string
}

export interface RegisterData {
  email?: string
  password?: string
  walletAddress: string
  name?: string
  referralCode?: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// ==========================================
// API TYPES
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ==========================================
// SYSTEM TYPES
// ==========================================

export interface SystemFunds {
  reserve: number
  operational: number
  profit: number
  jupiterPool: number  // Novo: Jupiter Pool
  totalIn: number
  totalOut: number
}

export interface SystemConfig {
  minQueueSize: number
  maxCyclesPerRun: number
  reservePercent: number
  operationalPercent: number
  bonusPercent: number
  profitPercent: number
  jupiterPoolPercent: number  // Novo: 10%
  isMaintenanceMode: boolean
  isProcessingEnabled: boolean
}

export interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalDeposits: number
  totalPaid: number
  totalCycles: number
  systemProfit: number
  jupiterPoolBalance: number  // Novo
}

// ==========================================
// JUPITER POOL TYPES
// ==========================================

export interface JupiterPoolHistory {
  id: string
  amount: number
  levelNumber: number
  type: 'DEPOSIT' | 'WITHDRAWAL'
  description?: string
  createdAt: Date
}

export interface JupiterPoolStats {
  balance: number
  totalDeposits: number
  totalWithdrawals: number
  lastActivity?: Date
}

// ==========================================
// BONUS RULES (Nova regra variável)
// ==========================================

export interface BonusRule {
  minReferrals: number
  maxReferrals: number
  bonusPercent: number
}

// Regras de bônus de indicação:
// 0-4 indicados: 0%
// 5-9 indicados: 20%
// 10+ indicados: 40%
export const BONUS_RULES: BonusRule[] = [
  { minReferrals: 0, maxReferrals: 4, bonusPercent: 0 },
  { minReferrals: 5, maxReferrals: 9, bonusPercent: 0.20 },
  { minReferrals: 10, maxReferrals: Infinity, bonusPercent: 0.40 },
]

// ==========================================
// CAP PROGRESSIVO DE INDICADOS
// ==========================================

export interface ReferralPointsTier {
  minReferrals: number
  maxReferrals: number
  pointsPerReferral: number
  maxPoints: number
}

// Faixas do CAP Progressivo:
// 1-10: ×10 pontos (máx 100)
// 11-30: ×5 pontos (máx 100)
// 31-50: ×2 pontos (máx 40)
// 51-100: ×1 ponto (máx 50)
// CAP TOTAL: 290 pontos
export const REFERRAL_POINTS_TIERS: ReferralPointsTier[] = [
  { minReferrals: 1, maxReferrals: 10, pointsPerReferral: 10, maxPoints: 100 },
  { minReferrals: 11, maxReferrals: 30, pointsPerReferral: 5, maxPoints: 100 },
  { minReferrals: 31, maxReferrals: 50, pointsPerReferral: 2, maxPoints: 40 },
  { minReferrals: 51, maxReferrals: 100, pointsPerReferral: 1, maxPoints: 50 },
]

export const MAX_REFERRAL_POINTS = 290
