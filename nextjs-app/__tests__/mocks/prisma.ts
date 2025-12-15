// Mock do Prisma Client para testes
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

// Cria mock profundo do PrismaClient
export const prismaMock = mockDeep<PrismaClient>()

// Função para resetar mocks entre testes
export const resetPrismaMock = () => mockReset(prismaMock)

// Mock do módulo prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
  prisma: prismaMock,
}))

export type PrismaMockType = DeepMockProxy<PrismaClient>
