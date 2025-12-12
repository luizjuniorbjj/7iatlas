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
}
