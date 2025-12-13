'use client'

import { useState } from 'react'

interface QuotaCardProps {
  level: number
  currentQuotas: number
  canPurchase: boolean
  reason?: string
  onPurchase: () => void
  loading?: boolean
}

export default function QuotaCard({
  level,
  currentQuotas,
  canPurchase,
  reason,
  onPurchase,
  loading,
}: QuotaCardProps) {
  const levelValues = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
  const receiveValues = levelValues.map((v) => v * 6 * 0.85)

  const entryValue = levelValues[level - 1]
  const receiveValue = receiveValues[level - 1]
  const profit = receiveValue - entryValue

  return (
    <div
      className={`glass-card p-5 transition-all ${
        canPurchase
          ? 'hover:border-gradient-mid/50 cursor-pointer'
          : 'opacity-60'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-orbitron font-bold text-lg ${
              canPurchase
                ? 'bg-gradient-to-r from-gradient-start to-gradient-mid'
                : 'bg-white/10'
            }`}
          >
            {level}
          </div>
          <div>
            <div className="font-orbitron font-bold">Nível {level}</div>
            <div className="text-sm text-text-secondary">
              ${entryValue} USDT
            </div>
          </div>
        </div>

        {currentQuotas > 0 && (
          <div className="px-3 py-1 bg-cyan/20 text-cyan text-sm rounded-full">
            {currentQuotas} cota{currentQuotas > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Recebe por ciclo:</span>
          <span className="font-medium text-green-aurora">
            ${receiveValue.toFixed(0)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Lucro líquido:</span>
          <span className="font-medium text-gold">
            +${profit.toFixed(0)} ({((profit / entryValue) * 100).toFixed(0)}%)
          </span>
        </div>
      </div>

      {!canPurchase && reason && (
        <div className="p-3 bg-red/10 border border-red/20 rounded-lg mb-4">
          <p className="text-sm text-red">{reason}</p>
        </div>
      )}

      <button
        onClick={onPurchase}
        disabled={!canPurchase || loading}
        className={`w-full py-3 rounded-xl font-medium transition-all ${
          canPurchase
            ? 'btn-primary'
            : 'bg-white/10 text-text-muted cursor-not-allowed'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processando...
          </span>
        ) : canPurchase ? (
          currentQuotas > 0 ? (
            `Comprar +1 Cota ($${entryValue})`
          ) : (
            `Comprar Cota ($${entryValue})`
          )
        ) : (
          'Indisponível'
        )}
      </button>
    </div>
  )
}
