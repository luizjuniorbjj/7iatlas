/**
 * TESTES DE VALIDAÇÃO - Regras de negócio críticas
 *
 * Estes testes verificam validações de entrada e regras críticas.
 */

import {
  calculateLevelValue,
  calculateReward,
  calculateBonus,
  calculateReferralPoints,
  calculateScore,
} from '@/services/matrix.service'

// ==========================================
// VALIDAÇÃO DE WALLET ADDRESS
// ==========================================
describe('Validação de Wallet Address', () => {
  // Simula validação de endereço Ethereum
  function isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // Simula validação de endereço Solana (Base58, 32-44 chars)
  function isValidSolanaAddress(address: string): boolean {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
    return base58Regex.test(address)
  }

  describe('Ethereum Address', () => {
    it('deve aceitar endereço válido', () => {
      expect(isValidEthereumAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true)
    })

    it('deve aceitar endereço com letras maiúsculas (checksum)', () => {
      expect(isValidEthereumAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true)
    })

    it('deve rejeitar endereço sem prefixo 0x', () => {
      expect(isValidEthereumAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false)
    })

    it('deve rejeitar endereço curto', () => {
      expect(isValidEthereumAddress('0x1234')).toBe(false)
    })

    it('deve rejeitar endereço longo', () => {
      expect(isValidEthereumAddress('0x1234567890abcdef1234567890abcdef1234567890')).toBe(false)
    })

    it('deve rejeitar endereço com caracteres inválidos', () => {
      expect(isValidEthereumAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false)
    })

    it('deve rejeitar endereço vazio', () => {
      expect(isValidEthereumAddress('')).toBe(false)
    })
  })

  describe('Solana Address', () => {
    it('deve aceitar endereço válido de 44 caracteres', () => {
      expect(isValidSolanaAddress('7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2')).toBe(true)
    })

    it('deve aceitar endereço válido de 32 caracteres', () => {
      expect(isValidSolanaAddress('11111111111111111111111111111111')).toBe(true)
    })

    it('deve rejeitar endereço com 0, O, I, l (não Base58)', () => {
      expect(isValidSolanaAddress('0OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')).toBe(false)
      expect(isValidSolanaAddress('IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII')).toBe(false)
      expect(isValidSolanaAddress('llllllllllllllllllllllllllllllll')).toBe(false)
    })

    it('deve rejeitar endereço curto (< 32)', () => {
      expect(isValidSolanaAddress('abc123')).toBe(false)
    })

    it('deve rejeitar endereço longo (> 44)', () => {
      expect(isValidSolanaAddress('7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2XXXXXX')).toBe(false)
    })
  })
})

// ==========================================
// VALIDAÇÃO DE EMAIL
// ==========================================
describe('Validação de Email', () => {
  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  it('deve aceitar email válido', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.org')).toBe(true)
    expect(isValidEmail('user+tag@domain.co.uk')).toBe(true)
  })

  it('deve rejeitar email sem @', () => {
    expect(isValidEmail('testexample.com')).toBe(false)
  })

  it('deve rejeitar email sem domínio', () => {
    expect(isValidEmail('test@')).toBe(false)
  })

  it('deve rejeitar email sem extensão', () => {
    expect(isValidEmail('test@domain')).toBe(false)
  })

  it('deve rejeitar email vazio', () => {
    expect(isValidEmail('')).toBe(false)
  })

  it('deve rejeitar email com espaços', () => {
    expect(isValidEmail('test @example.com')).toBe(false)
    expect(isValidEmail('test@ example.com')).toBe(false)
  })
})

// ==========================================
// VALIDAÇÃO DE PIN
// ==========================================
describe('Validação de PIN', () => {
  function isValidPin(pin: string): { valid: boolean; reason?: string } {
    if (!pin || pin.length === 0) {
      return { valid: false, reason: 'PIN é obrigatório' }
    }

    if (pin.length !== 6) {
      return { valid: false, reason: 'PIN deve ter 6 dígitos' }
    }

    if (!/^\d+$/.test(pin)) {
      return { valid: false, reason: 'PIN deve conter apenas números' }
    }

    // Verificar PINs fracos
    if (/^(.)\1{5}$/.test(pin)) {
      return { valid: false, reason: 'PIN não pode ser todos dígitos iguais' }
    }

    if (['123456', '654321', '000000', '111111', '123123'].includes(pin)) {
      return { valid: false, reason: 'PIN muito comum' }
    }

    return { valid: true }
  }

  it('deve aceitar PIN válido de 6 dígitos', () => {
    expect(isValidPin('482915').valid).toBe(true)
    expect(isValidPin('837264').valid).toBe(true)
  })

  it('deve rejeitar PIN vazio', () => {
    expect(isValidPin('').valid).toBe(false)
    expect(isValidPin('').reason).toBe('PIN é obrigatório')
  })

  it('deve rejeitar PIN curto', () => {
    expect(isValidPin('123').valid).toBe(false)
    expect(isValidPin('12345').valid).toBe(false)
  })

  it('deve rejeitar PIN longo', () => {
    expect(isValidPin('1234567').valid).toBe(false)
  })

  it('deve rejeitar PIN com letras', () => {
    expect(isValidPin('12345a').valid).toBe(false)
    expect(isValidPin('abcdef').valid).toBe(false)
  })

  it('deve rejeitar PIN com caracteres especiais', () => {
    expect(isValidPin('12345!').valid).toBe(false)
    expect(isValidPin('12-345').valid).toBe(false)
  })

  it('deve rejeitar PIN com todos dígitos iguais', () => {
    expect(isValidPin('000000').valid).toBe(false)
    expect(isValidPin('111111').valid).toBe(false)
    expect(isValidPin('999999').valid).toBe(false)
  })

  it('deve rejeitar PINs comuns', () => {
    expect(isValidPin('123456').valid).toBe(false)
    expect(isValidPin('654321').valid).toBe(false)
  })
})

// ==========================================
// VALIDAÇÃO DE VALORES MONETÁRIOS
// ==========================================
describe('Validação de Valores Monetários', () => {
  function isValidAmount(amount: number, min: number = 0, max: number = Infinity): { valid: boolean; reason?: string } {
    if (typeof amount !== 'number') {
      return { valid: false, reason: 'Valor deve ser um número' }
    }

    if (isNaN(amount)) {
      return { valid: false, reason: 'Valor inválido (NaN)' }
    }

    if (!isFinite(amount)) {
      return { valid: false, reason: 'Valor deve ser finito' }
    }

    if (amount < min) {
      return { valid: false, reason: `Valor mínimo é $${min}` }
    }

    if (amount > max) {
      return { valid: false, reason: `Valor máximo é $${max}` }
    }

    // Verificar precisão (máx 2 casas decimais)
    if (Math.round(amount * 100) !== amount * 100) {
      return { valid: false, reason: 'Máximo 2 casas decimais' }
    }

    return { valid: true }
  }

  it('deve aceitar valores válidos', () => {
    expect(isValidAmount(10).valid).toBe(true)
    expect(isValidAmount(100.50).valid).toBe(true)
    expect(isValidAmount(0).valid).toBe(true)
  })

  it('deve aceitar valores com 2 casas decimais', () => {
    expect(isValidAmount(10.01).valid).toBe(true)
    expect(isValidAmount(99.99).valid).toBe(true)
  })

  it('deve rejeitar valores negativos quando min=0', () => {
    expect(isValidAmount(-1, 0).valid).toBe(false)
    expect(isValidAmount(-0.01, 0).valid).toBe(false)
  })

  it('deve rejeitar valores acima do máximo', () => {
    expect(isValidAmount(1001, 0, 1000).valid).toBe(false)
  })

  it('deve rejeitar NaN', () => {
    expect(isValidAmount(NaN).valid).toBe(false)
  })

  it('deve rejeitar Infinity', () => {
    expect(isValidAmount(Infinity).valid).toBe(false)
    expect(isValidAmount(-Infinity).valid).toBe(false)
  })

  it('deve rejeitar mais de 2 casas decimais', () => {
    expect(isValidAmount(10.001).valid).toBe(false)
    expect(isValidAmount(10.123).valid).toBe(false)
  })

  describe('Valores de entrada por nível', () => {
    it('deve validar valores corretos para cada nível', () => {
      const expectedValues = [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120]

      for (let level = 1; level <= 10; level++) {
        const value = calculateLevelValue(level)
        expect(isValidAmount(value, 10, 10000).valid).toBe(true)
        expect(value).toBe(expectedValues[level - 1])
      }
    })

    it('valor mínimo de transferência deve ser $10', () => {
      const minTransfer = 10
      expect(isValidAmount(9.99, minTransfer).valid).toBe(false)
      expect(isValidAmount(10, minTransfer).valid).toBe(true)
    })
  })
})

// ==========================================
// VALIDAÇÃO DE TX HASH
// ==========================================
describe('Validação de Transaction Hash', () => {
  function isValidEthTxHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash)
  }

  function isValidSolanaTxHash(hash: string): boolean {
    // Solana TX signatures são Base58, 87-88 chars
    return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(hash)
  }

  describe('Ethereum TX Hash', () => {
    it('deve aceitar hash válido', () => {
      expect(isValidEthTxHash('0x' + 'a'.repeat(64))).toBe(true)
      expect(isValidEthTxHash('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')).toBe(true)
    })

    it('deve rejeitar hash curto', () => {
      expect(isValidEthTxHash('0x1234')).toBe(false)
    })

    it('deve rejeitar hash sem 0x', () => {
      expect(isValidEthTxHash('a'.repeat(64))).toBe(false)
    })
  })

  describe('Solana TX Hash', () => {
    it('deve aceitar signature válida de 88 caracteres', () => {
      const validSig = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW'
      expect(isValidSolanaTxHash(validSig)).toBe(true)
    })

    it('deve rejeitar signature curta', () => {
      expect(isValidSolanaTxHash('abc123')).toBe(false)
    })
  })
})

// ==========================================
// VALIDAÇÃO DE REFERRAL CODE
// ==========================================
describe('Validação de Referral Code', () => {
  function isValidReferralCode(code: string): boolean {
    // Código deve ter 6-10 caracteres alfanuméricos
    return /^[A-Z0-9]{6,10}$/i.test(code)
  }

  function generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  it('deve aceitar código válido', () => {
    expect(isValidReferralCode('ABC123')).toBe(true)
    expect(isValidReferralCode('ABCD1234')).toBe(true)
    expect(isValidReferralCode('abc123')).toBe(true) // case insensitive
  })

  it('deve rejeitar código curto', () => {
    expect(isValidReferralCode('ABC12')).toBe(false)
    expect(isValidReferralCode('AB')).toBe(false)
  })

  it('deve rejeitar código longo', () => {
    expect(isValidReferralCode('ABCDEFGHIJK')).toBe(false)
  })

  it('deve rejeitar código com caracteres especiais', () => {
    expect(isValidReferralCode('ABC-123')).toBe(false)
    expect(isValidReferralCode('ABC_123')).toBe(false)
    expect(isValidReferralCode('ABC 123')).toBe(false)
  })

  it('deve gerar códigos válidos', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateReferralCode()
      expect(isValidReferralCode(code)).toBe(true)
    }
  })

  it('deve gerar códigos únicos', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      codes.add(generateReferralCode())
    }
    // Com 36^8 combinações, 1000 códigos devem ser praticamente todos únicos
    expect(codes.size).toBeGreaterThan(990)
  })
})

// ==========================================
// VALIDAÇÃO DE REGRAS DE NEGÓCIO
// ==========================================
describe('Validação de Regras de Negócio', () => {
  describe('Score CAP', () => {
    it('score de indicados deve respeitar CAP de 290', () => {
      expect(calculateReferralPoints(100)).toBe(290)
      expect(calculateReferralPoints(1000)).toBe(290)
      expect(calculateReferralPoints(10000)).toBe(290)
    })

    it('score total pode exceder CAP quando inclui tempo e reentradas', () => {
      // 100h espera = 200, 100 reentradas = 150, 100 indicados = 290
      // Total = 640 (sem CAP no total, só nos indicados)
      const score = calculateScore(100, 100, 100)
      expect(score).toBe(200 + 150 + 290)
    })
  })

  describe('Multiplicador de Nível', () => {
    it('cada nível deve ser exatamente 2x o anterior', () => {
      for (let level = 2; level <= 10; level++) {
        const current = calculateLevelValue(level)
        const previous = calculateLevelValue(level - 1)
        expect(current / previous).toBe(2)
      }
    })
  })

  describe('Recompensa e Bônus', () => {
    it('recompensa deve ser 200% do valor de entrada', () => {
      for (let level = 1; level <= 10; level++) {
        const entry = calculateLevelValue(level)
        const reward = calculateReward(level)
        expect(reward / entry).toBe(2)
      }
    })

    it('bônus deve ser 40% do valor de entrada', () => {
      for (let level = 1; level <= 10; level++) {
        const entry = calculateLevelValue(level)
        const bonus = calculateBonus(level)
        expect(bonus / entry).toBeCloseTo(0.4)
      }
    })
  })
})
