// 7iATLAS - Utilitários de Formatação

/**
 * Formata número como moeda (USD por padrão, mas com separador de milhar)
 * Exemplo: 520032 -> "$520,032.00"
 */
export function formatCurrency(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '$0.00'
  }

  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formata número com separador de milhares
 * Exemplo: 520032 -> "520,032"
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0'
  }

  return value.toLocaleString('en-US')
}

/**
 * Formata número grande de forma compacta
 * Exemplo: 1500000 -> "1.5M", 1500 -> "1.5K"
 */
export function formatCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0'
  }

  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  return value.toString()
}
