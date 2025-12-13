'use client'

import { useState, useEffect } from 'react'

interface TransferLimits {
  minAmount: number
  maxPerTransaction: number
  maxPerDay: number
  usedToday: number
  availableToday: number
}

interface TransferFormProps {
  balance: number
  onSuccess: () => void
}

export default function TransferForm({ balance, onSuccess }: TransferFormProps) {
  const [recipientWallet, setRecipientWallet] = useState('')
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [limits, setLimits] = useState<TransferLimits | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasPin, setHasPin] = useState(false)
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        // Verifica se tem PIN
        const pinRes = await fetch('/api/users/pin', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const pinData = await pinRes.json()
        setHasPin(pinData.hasPin)

        // Busca limites
        const limitsRes = await fetch('/api/transfers?type=limits', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const limitsData = await limitsRes.json()
        if (limitsData.limits) {
          setLimits(limitsData.limits)
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      }
    }

    fetchData()
  }, [])

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin !== confirmPin) {
      setError('Os PINs não coincidem')
      return
    }
    if (newPin.length < 4 || newPin.length > 6) {
      setError('O PIN deve ter entre 4 e 6 dígitos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/users/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: newPin }),
      })

      const data = await res.json()
      if (data.success) {
        setHasPin(true)
        setShowPinSetup(false)
        setNewPin('')
        setConfirmPin('')
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientWallet,
          amount: parseFloat(amount),
          pin,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccess(true)
        setRecipientWallet('')
        setAmount('')
        setPin('')
        onSuccess()
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Tela de configuração de PIN
  if (!hasPin) {
    return (
      <div className="glass-card p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h3 className="font-orbitron text-lg mb-2">Configure seu PIN</h3>
          <p className="text-text-secondary text-sm">
            Para realizar transferências, você precisa configurar um PIN de segurança
          </p>
        </div>

        {showPinSetup ? (
          <form onSubmit={handleSetupPin} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Novo PIN (4-6 dígitos)
              </label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center text-2xl tracking-widest"
                placeholder="••••"
                maxLength={6}
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Confirme o PIN
              </label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center text-2xl tracking-widest"
                placeholder="••••"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red/10 border border-red/20 rounded-lg">
                <p className="text-sm text-red">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPinSetup(false)}
                className="btn-secondary flex-1 py-3"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || newPin.length < 4}
                className="btn-primary flex-1 py-3"
              >
                {loading ? 'Salvando...' : 'Salvar PIN'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowPinSetup(true)}
            className="btn-primary w-full py-3"
          >
            Configurar PIN
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-orbitron text-lg mb-4">Transferir Saldo</h3>

      {/* Saldo disponível */}
      <div className="p-4 bg-white/5 rounded-xl mb-6">
        <div className="text-sm text-text-secondary mb-1">Saldo disponível</div>
        <div className="font-orbitron text-2xl font-bold text-green-aurora">
          ${balance.toFixed(2)}
        </div>
        {limits && (
          <div className="text-xs text-text-muted mt-2">
            Disponível hoje: ${limits.availableToday.toFixed(2)} / ${limits.maxPerDay.toFixed(2)}
          </div>
        )}
      </div>

      {success && (
        <div className="p-4 bg-green-aurora/10 border border-green-aurora/20 rounded-xl mb-4">
          <p className="text-green-aurora">✓ Transferência realizada com sucesso!</p>
        </div>
      )}

      <form onSubmit={handleTransfer} className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Carteira do destinatário
          </label>
          <input
            type="text"
            value={recipientWallet}
            onChange={(e) => setRecipientWallet(e.target.value)}
            className="input-field"
            placeholder="0x..."
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Valor (USDT)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field"
            placeholder="0.00"
            min={limits?.minAmount || 1}
            max={Math.min(balance, limits?.availableToday || balance)}
            step="0.01"
          />
          {limits && (
            <div className="text-xs text-text-muted mt-1">
              Mín: ${limits.minAmount} | Máx por transação: ${limits.maxPerTransaction}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-2">
            PIN de segurança
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input-field text-center text-xl tracking-widest"
            placeholder="••••"
            maxLength={6}
          />
        </div>

        {error && (
          <div className="p-3 bg-red/10 border border-red/20 rounded-lg">
            <p className="text-sm text-red">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !recipientWallet || !amount || !pin}
          className="btn-primary w-full py-3"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processando...
            </span>
          ) : (
            'Transferir'
          )}
        </button>
      </form>
    </div>
  )
}
