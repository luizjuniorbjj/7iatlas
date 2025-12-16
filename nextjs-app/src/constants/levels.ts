// 7iATLAS - Constantes dos Niveis
// Fonte: 7iATLAS-DOCUMENTACAO-TECNICA.md
// SEMPRE consultar a documentacao antes de alterar estes valores

export const LEVEL_CONFIG = {
  // Valores de entrada por nivel (em USD)
  ENTRY_VALUES: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120],

  // Ganho por ciclo (2x a entrada)
  REWARD_VALUES: [20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240],

  // Bonus de indicacao (40% da posicao 5)
  BONUS_VALUES: [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048],

  // Ganho acumulado se completar todos os ciclos
  ACCUMULATED: [20, 60, 140, 300, 620, 1260, 2540, 5100, 10220, 20460],

  // Total de niveis
  TOTAL_LEVELS: 10,

  // Minimo de participantes para ciclar
  MIN_PARTICIPANTS: 7,

  // Multiplicador de ganho (2x)
  REWARD_MULTIPLIER: 2,
} as const

// Helper functions
export const getLevelEntryValue = (level: number): number => {
  if (level < 1 || level > 10) return 0
  return LEVEL_CONFIG.ENTRY_VALUES[level - 1]
}

export const getLevelRewardValue = (level: number): number => {
  if (level < 1 || level > 10) return 0
  return LEVEL_CONFIG.REWARD_VALUES[level - 1]
}

export const getLevelBonusValue = (level: number): number => {
  if (level < 1 || level > 10) return 0
  return LEVEL_CONFIG.BONUS_VALUES[level - 1]
}

export const getLevelProfit = (level: number): number => {
  // Lucro = Ganho - Entrada
  const entry = getLevelEntryValue(level)
  const reward = getLevelRewardValue(level)
  return reward - entry
}

export const getLevelProfitPercentage = (): number => {
  // Sempre 100% de lucro (entrada * 2 = ganho)
  return 100
}
