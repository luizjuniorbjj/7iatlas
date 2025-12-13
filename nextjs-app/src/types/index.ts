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
  balance: number  // Saldo disponível para transferências
  // PIN
  pinHash?: string
  pinAttempts: number
  pinBlockedUntil?: Date
  pinCreatedAt?: Date
  // Preferências de notificação
  notifyEmail: boolean
  notifyPush: boolean
  notifyOnQueueAdvance: boolean
  notifyOnCycle: boolean
  notifyOnBonus: boolean
  notifyOnTransfer: boolean
  notifyFrequency: string
  showNameInQueue: boolean
  // Timestamps
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
  quotaNumber: number  // Número da cota (1, 2, 3...)
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

export type TransactionType =
  | 'DEPOSIT'
  | 'CYCLE_REWARD'
  | 'BONUS_REFERRAL'
  | 'WITHDRAWAL'
  | 'INTERNAL_TRANSFER_IN'
  | 'INTERNAL_TRANSFER_OUT'
  | 'QUOTA_PURCHASE'
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

// ==========================================
// TRANSFER TYPES (v1.4)
// ==========================================

export interface InternalTransfer {
  id: string
  fromUserId: string
  toUserId: string
  amount: number
  status: string
  description?: string
  createdAt: Date
}

export interface TransferLimits {
  minAmount: number
  dailyLimit: number
  maxTransactionsPerDay: number
  usedToday: number
  remainingToday: number
  transactionsToday: number
  transactionsRemaining: number
}

// ==========================================
// QUOTA TYPES (v1.4)
// ==========================================

export interface QuotaInfo {
  id: string
  quotaNumber: number
  levelNumber: number
  status: QueueStatus
  score: number
  reentries: number
  position?: number
  enteredAt: Date
  processedAt?: Date
}

export interface CanPurchaseResult {
  canPurchase: boolean
  reason?: string
}

// ==========================================
// MATRIX VISUALIZATION TYPES (v1.4)
// ==========================================

export interface QueuePosition {
  position: number
  totalInQueue: number
  percentile: number
  estimatedWait: string
  score: number
  enteredAt: Date
  reentries: number
  quotaNumber: number
}

export interface LevelStats {
  levelId: number
  levelNumber: number
  entryValue: number
  rewardValue: number
  totalCycles: number
  cyclesToday: number
  avgCyclesPerDay: number
  avgWaitTime: number
  totalInQueue: number
  oldestEntry: {
    enteredAt: Date
    daysAgo: number
  } | null
}

export interface QueueListItem {
  position: number
  userId: string
  name: string
  code: string
  score: number
  timeInQueue: string
  reentries: number
  isCurrentUser: boolean
}

// ==========================================
// NOTIFICATION TYPES (v1.4)
// ==========================================

export type NotificationChannel = 'EMAIL' | 'PUSH'

export type NotificationEvent =
  | 'QUEUE_ADVANCE'
  | 'CYCLE_COMPLETED'
  | 'BONUS_RECEIVED'
  | 'TRANSFER_RECEIVED'
  | 'TRANSFER_SENT'
  | 'SYSTEM_ALERT'

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CLICKED'

export interface NotificationPreferences {
  notifyEmail: boolean
  notifyPush: boolean
  notifyOnQueueAdvance: boolean
  notifyOnCycle: boolean
  notifyOnBonus: boolean
  notifyOnTransfer: boolean
  notifyFrequency: 'realtime' | 'daily' | 'weekly'
}

export interface NotificationLog {
  id: string
  userId: string
  channel: NotificationChannel
  event: NotificationEvent
  title: string
  body: string
  data?: Record<string, any>
  status: NotificationStatus
  sentAt?: Date
  clickedAt?: Date
  errorMsg?: string
  createdAt: Date
}

export interface PushSubscription {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  device?: string
  createdAt: Date
  lastUsedAt?: Date
}
