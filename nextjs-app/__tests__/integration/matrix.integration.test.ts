/**
 * TESTES DE INTEGRAÇÃO REAIS - matrix.service.ts
 *
 * Estes testes usam mocks do Prisma para testar as funções
 * que interagem com o banco de dados.
 */

import { prismaMock, resetPrismaMock } from '../mocks/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// Importa as funções REAIS do serviço
import {
  addToQueue,
  countUserQuotas,
  canPurchaseQuota,
  purchaseQuota,
  canProcessCycle,
  calculateLevelValue,
} from '@/services/matrix.service'

// Mock do blockchain service
jest.mock('@/services/blockchain.service', () => ({
  blockchainService: {
    sendUSDT: jest.fn().mockResolvedValue('mock_tx_hash_123'),
  },
}))

describe('Matrix Service - Funções de Fila (com Prisma Mock)', () => {
  beforeEach(() => {
    resetPrismaMock()
    jest.clearAllMocks()
  })

  // ==========================================
  // addToQueue
  // ==========================================
  describe('addToQueue', () => {
    it('deve adicionar usuário à fila de um nível', async () => {
      const mockLevel = {
        id: 'level_1',
        levelNumber: 1,
        entryValue: new Decimal(10),
        rewardValue: new Decimal(20),
        bonusValue: new Decimal(4),
        cashBalance: new Decimal(0),
        totalUsers: 0,
        totalCycles: 0,
      }

      const mockEntry = {
        id: 'entry_1',
        userId: 'user_1',
        levelId: 'level_1',
        status: 'WAITING',
        score: 0,
        quotaNumber: 1,
        reentries: 0,
        enteredAt: new Date(),
        processedAt: null,
      }

      prismaMock.level.findUnique.mockResolvedValue(mockLevel)
      prismaMock.queueEntry.count.mockResolvedValue(0)
      prismaMock.queueEntry.create.mockResolvedValue(mockEntry as any)
      prismaMock.level.update.mockResolvedValue(mockLevel)

      const result = await addToQueue('user_1', 1, true)

      expect(result).toEqual(mockEntry)
      expect(prismaMock.level.findUnique).toHaveBeenCalledWith({
        where: { levelNumber: 1 },
      })
      expect(prismaMock.queueEntry.create).toHaveBeenCalled()
    })

    it('deve lançar erro se nível não existir', async () => {
      prismaMock.level.findUnique.mockResolvedValue(null)

      await expect(addToQueue('user_1', 99, true)).rejects.toThrow(
        'Nível 99 não encontrado'
      )
    })

    it('deve incrementar reentradas se já estiver na fila', async () => {
      const mockLevel = {
        id: 'level_1',
        levelNumber: 1,
        entryValue: new Decimal(10),
        rewardValue: new Decimal(20),
        bonusValue: new Decimal(4),
        cashBalance: new Decimal(0),
        totalUsers: 1,
        totalCycles: 0,
      }

      const existingEntry = {
        id: 'entry_1',
        userId: 'user_1',
        levelId: 'level_1',
        status: 'WAITING',
        score: 10,
        quotaNumber: 1,
        reentries: 2,
        enteredAt: new Date(),
        processedAt: null,
      }

      prismaMock.level.findUnique.mockResolvedValue(mockLevel)
      prismaMock.queueEntry.findFirst.mockResolvedValue(existingEntry as any)
      prismaMock.queueEntry.update.mockResolvedValue({
        ...existingEntry,
        reentries: 3,
      } as any)

      const result = await addToQueue('user_1', 1, false) // isNewQuota = false

      expect(result).toEqual(existingEntry)
      expect(prismaMock.queueEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry_1' },
        data: { reentries: { increment: 1 } },
      })
    })
  })

  // ==========================================
  // countUserQuotas
  // ==========================================
  describe('countUserQuotas', () => {
    it('deve contar cotas ativas de um usuário', async () => {
      const mockLevel = {
        id: 'level_1',
        levelNumber: 1,
        entryValue: new Decimal(10),
        rewardValue: new Decimal(20),
        bonusValue: new Decimal(4),
        cashBalance: new Decimal(100),
        totalUsers: 10,
        totalCycles: 5,
      }

      prismaMock.level.findUnique.mockResolvedValue(mockLevel)
      prismaMock.queueEntry.count.mockResolvedValue(3)

      const count = await countUserQuotas('user_1', 1)

      expect(count).toBe(3)
      expect(prismaMock.queueEntry.count).toHaveBeenCalledWith({
        where: {
          userId: 'user_1',
          levelId: 'level_1',
          status: 'WAITING',
        },
      })
    })

    it('deve retornar 0 se nível não existir', async () => {
      prismaMock.level.findUnique.mockResolvedValue(null)

      const count = await countUserQuotas('user_1', 99)

      expect(count).toBe(0)
    })
  })

  // ==========================================
  // canPurchaseQuota
  // ==========================================
  describe('canPurchaseQuota', () => {
    it('deve permitir compra no nível 1 para usuário ativo', async () => {
      const mockUser = {
        id: 'user_1',
        name: 'Test User',
        email: 'test@example.com',
        walletAddress: 'wallet_123',
        status: 'ACTIVE',
        balance: new Decimal(100),
        totalDeposited: new Decimal(10),
        totalEarned: new Decimal(0),
        totalBonus: new Decimal(0),
        referrerId: null,
        referralCode: 'ABC123',
        pinHash: null,
        pinAttempts: 0,
        pinLockedUntil: null,
        createdAt: new Date(),
        activatedAt: new Date(),
      }

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any)

      const result = await canPurchaseQuota('user_1', 1)

      expect(result).toEqual({ canPurchase: true })
    })

    it('deve negar compra para usuário não encontrado', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      const result = await canPurchaseQuota('user_999', 1)

      expect(result).toEqual({
        canPurchase: false,
        reason: 'Usuário não encontrado',
      })
    })

    it('deve negar compra para usuário inativo', async () => {
      const mockUser = {
        id: 'user_1',
        status: 'PENDING',
      }

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any)

      const result = await canPurchaseQuota('user_1', 1)

      expect(result).toEqual({
        canPurchase: false,
        reason: 'Usuário não está ativo',
      })
    })

    it('deve negar compra em nível superior sem cota no anterior', async () => {
      const mockUser = {
        id: 'user_1',
        status: 'ACTIVE',
      }

      const mockLevel = {
        id: 'level_1',
        levelNumber: 1,
      }

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any)
      prismaMock.level.findUnique.mockResolvedValue(mockLevel as any)
      prismaMock.queueEntry.count.mockResolvedValue(0) // Sem cotas no N1

      const result = await canPurchaseQuota('user_1', 2)

      expect(result).toEqual({
        canPurchase: false,
        reason: 'Precisa ter pelo menos 1 cota no Nível 1 primeiro',
      })
    })

    it('deve permitir compra em nível superior com cota no anterior', async () => {
      const mockUser = {
        id: 'user_1',
        status: 'ACTIVE',
      }

      const mockLevel1 = { id: 'level_1', levelNumber: 1 }

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any)
      prismaMock.level.findUnique.mockResolvedValue(mockLevel1 as any)
      prismaMock.queueEntry.count.mockResolvedValue(1) // Tem 1 cota no N1

      const result = await canPurchaseQuota('user_1', 2)

      expect(result).toEqual({ canPurchase: true })
    })
  })

  // ==========================================
  // canProcessCycle
  // ==========================================
  describe('canProcessCycle', () => {
    it('deve retornar true se tem 7 pessoas e saldo suficiente', async () => {
      const mockLevel = {
        id: 'level_1',
        levelNumber: 1,
        entryValue: new Decimal(10),
        cashBalance: new Decimal(70), // 7 x $10 = $70
        totalUsers: 10,
        totalCycles: 0,
      }

      prismaMock.level.findUnique.mockResolvedValue(mockLevel as any)
      prismaMock.queueEntry.count.mockResolvedValue(7)

      const result = await canProcessCycle(1)

      expect(result).toBe(true)
    })

    it('deve retornar false se tem menos de 7 pessoas', async () => {
      const mockLevel = {
        id: 'level_1',
        levelNumber: 1,
        entryValue: new Decimal(10),
        cashBalance: new Decimal(70),
        totalUsers: 5,
        totalCycles: 0,
      }

      prismaMock.level.findUnique.mockResolvedValue(mockLevel as any)
      prismaMock.queueEntry.count.mockResolvedValue(5)

      const result = await canProcessCycle(1)

      expect(result).toBe(false)
    })

    it('deve retornar false se não tem saldo suficiente', async () => {
      const mockLevel = {
        id: 'level_1',
        levelNumber: 1,
        entryValue: new Decimal(10),
        cashBalance: new Decimal(50), // Menos que $70
        totalUsers: 10,
        totalCycles: 0,
      }

      prismaMock.level.findUnique.mockResolvedValue(mockLevel as any)
      prismaMock.queueEntry.count.mockResolvedValue(7)

      const result = await canProcessCycle(1)

      expect(result).toBe(false)
    })

    it('deve retornar false se nível não existe', async () => {
      prismaMock.level.findUnique.mockResolvedValue(null)

      const result = await canProcessCycle(99)

      expect(result).toBe(false)
    })
  })

  // ==========================================
  // purchaseQuota
  // ==========================================
  describe('purchaseQuota', () => {
    it('deve comprar cota com saldo interno', async () => {
      const mockUser = {
        id: 'user_1',
        status: 'ACTIVE',
        balance: new Decimal(100),
      }

      const mockLevel = {
        id: 'level_1',
        levelNumber: 1,
        entryValue: new Decimal(10),
      }

      const mockEntry = {
        id: 'entry_1',
        quotaNumber: 1,
      }

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any)
      prismaMock.level.findUnique.mockResolvedValue(mockLevel as any)
      prismaMock.queueEntry.count.mockResolvedValue(0)
      prismaMock.queueEntry.findFirst.mockResolvedValue(null)
      prismaMock.queueEntry.create.mockResolvedValue(mockEntry as any)
      prismaMock.user.update.mockResolvedValue(mockUser as any)
      prismaMock.level.update.mockResolvedValue(mockLevel as any)
      prismaMock.transaction.create.mockResolvedValue({} as any)
      prismaMock.systemFunds.update.mockResolvedValue({} as any)

      const result = await purchaseQuota('user_1', 1)

      expect(result.success).toBe(true)
      expect(result.quotaNumber).toBe(1)
    })

    it('deve negar compra se saldo insuficiente', async () => {
      const mockUser = {
        id: 'user_1',
        status: 'ACTIVE',
        balance: new Decimal(5), // Menos que $10
      }

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any)
      prismaMock.level.findUnique.mockResolvedValue(null)
      prismaMock.queueEntry.count.mockResolvedValue(0)

      const result = await purchaseQuota('user_1', 1)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Saldo insuficiente')
    })

    it('deve aceitar compra com txHash (blockchain)', async () => {
      const mockUser = {
        id: 'user_1',
        status: 'ACTIVE',
        balance: new Decimal(0), // Saldo zero, mas pagando via blockchain
      }

      const mockLevel = {
        id: 'level_1',
        levelNumber: 1,
        entryValue: new Decimal(10),
      }

      const mockEntry = {
        id: 'entry_1',
        quotaNumber: 1,
      }

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any)
      prismaMock.level.findUnique.mockResolvedValue(mockLevel as any)
      prismaMock.queueEntry.count.mockResolvedValue(0)
      prismaMock.queueEntry.findFirst.mockResolvedValue(null)
      prismaMock.queueEntry.create.mockResolvedValue(mockEntry as any)
      prismaMock.user.update.mockResolvedValue(mockUser as any)
      prismaMock.level.update.mockResolvedValue(mockLevel as any)
      prismaMock.transaction.create.mockResolvedValue({} as any)
      prismaMock.systemFunds.update.mockResolvedValue({} as any)

      const result = await purchaseQuota('user_1', 1, 'tx_hash_123')

      expect(result.success).toBe(true)
    })
  })
})

// ==========================================
// TESTES DE CENÁRIOS COMPLETOS
// ==========================================
describe('Matrix Service - Cenários End-to-End', () => {
  beforeEach(() => {
    resetPrismaMock()
    jest.clearAllMocks()
  })

  describe('Fluxo de Compra de Cota', () => {
    it('deve validar fluxo completo de compra', async () => {
      // 1. Verifica se pode comprar
      const mockUser = {
        id: 'user_1',
        status: 'ACTIVE',
        balance: new Decimal(100),
      }

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any)

      const canBuy = await canPurchaseQuota('user_1', 1)
      expect(canBuy.canPurchase).toBe(true)

      // 2. Calcula valor
      const value = calculateLevelValue(1)
      expect(value).toBe(10)

      // 3. Verifica saldo
      expect(mockUser.balance.toNumber()).toBeGreaterThanOrEqual(value)
    })
  })

  describe('Validação de Progressão', () => {
    it('usuário deve passar por N1 antes de N2', async () => {
      const mockUser = { id: 'user_1', status: 'ACTIVE' }

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any)
      prismaMock.level.findUnique.mockResolvedValue({ id: 'level_1', levelNumber: 1 } as any)
      prismaMock.queueEntry.count.mockResolvedValue(0) // Sem cotas

      const canBuyN2 = await canPurchaseQuota('user_1', 2)
      expect(canBuyN2.canPurchase).toBe(false)
      expect(canBuyN2.reason).toContain('Nível 1')
    })
  })

  describe('Requisitos de Ciclo', () => {
    it('ciclo requer exatamente 7 pessoas e saldo correto', async () => {
      const entryValue = calculateLevelValue(1) // $10
      const requiredBalance = entryValue * 7 // $70

      const mockLevel = {
        id: 'level_1',
        levelNumber: 1,
        entryValue: new Decimal(10),
        cashBalance: new Decimal(requiredBalance),
      }

      prismaMock.level.findUnique.mockResolvedValue(mockLevel as any)
      prismaMock.queueEntry.count.mockResolvedValue(7)

      const canProcess = await canProcessCycle(1)
      expect(canProcess).toBe(true)

      // Com 6 pessoas, não pode
      prismaMock.queueEntry.count.mockResolvedValue(6)
      const cannotProcess = await canProcessCycle(1)
      expect(cannotProcess).toBe(false)
    })
  })
})
