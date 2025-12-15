'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface UserData {
  id: string
  name?: string
  email?: string
  walletAddress: string
  referralCode: string
  status: string
  currentLevel: number
  createdAt: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // PIN states
  const [hasPin, setHasPin] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    // Fetch user data
    fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setUser(res.data.user)
          setName(res.data.user.name || '')
          setEmail(res.data.user.email || '')
        }
      })

    // Check if has PIN
    fetch('/api/users/pin', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setHasPin(res.hasPin)
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  const saveProfile = async () => {
    setSaving(true)
    setMessage(null)

    const token = localStorage.getItem('accessToken')

    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email })
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
        setUser(data.data)
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' })
    } finally {
      setSaving(false)
    }
  }

  const savePin = async () => {
    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: 'PINs não conferem' })
      return
    }

    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setMessage({ type: 'error', text: 'PIN deve ter 6 dígitos numéricos' })
      return
    }

    setSavingPin(true)
    setMessage(null)

    const token = localStorage.getItem('accessToken')

    try {
      const body: any = { pin: newPin }
      if (hasPin) {
        body.currentPin = currentPin
      }

      const res = await fetch('/api/users/pin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: hasPin ? 'PIN alterado com sucesso!' : 'PIN criado com sucesso!' })
        setHasPin(true)
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar PIN' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' })
    } finally {
      setSavingPin(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatWallet = (wallet: string) => {
    return `${wallet.substring(0, 10)}...${wallet.substring(36)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="7iATLAS"
            width={200}
            height={67}
            className="mx-auto animate-pulse"
            priority
          />
          <p className="text-text-secondary mt-4">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-orbitron text-2xl font-bold">Configurações</h1>
        <p className="text-text-secondary">Gerencie sua conta e preferências</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl mb-6 ${
          message.type === 'success' ? 'bg-green-aurora/20 text-green-aurora' : 'bg-red/20 text-red'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="glass-card p-6">
          <h2 className="font-orbitron text-lg mb-6">Perfil</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field w-full"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Carteira</label>
              <div className="input-field w-full bg-white/5 cursor-not-allowed">
                {user?.walletAddress ? formatWallet(user.walletAddress) : '-'}
              </div>
              <p className="text-xs text-text-secondary mt-1">A carteira não pode ser alterada</p>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="btn-primary w-full"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        {/* PIN Settings */}
        <div className="glass-card p-6">
          <h2 className="font-orbitron text-lg mb-6">PIN de Segurança</h2>

          <div className="p-4 bg-white/5 rounded-xl mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                hasPin ? 'bg-green-aurora/20 text-green-aurora' : 'bg-gold/20 text-gold'
              }`}>
                {hasPin ? '🔒' : '🔓'}
              </div>
              <div>
                <div className="font-medium">{hasPin ? 'PIN Configurado' : 'PIN Não Configurado'}</div>
                <div className="text-sm text-text-secondary">
                  {hasPin ? 'Seu PIN está ativo' : 'Configure um PIN para transferências'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {hasPin && (
              <div>
                <label className="block text-sm text-text-secondary mb-2">PIN Atual</label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field w-full"
                  placeholder="••••••"
                  maxLength={6}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-text-secondary mb-2">
                {hasPin ? 'Novo PIN' : 'Criar PIN'}
              </label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field w-full"
                placeholder="6 dígitos"
                maxLength={6}
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Confirmar PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field w-full"
                placeholder="Confirme o PIN"
                maxLength={6}
              />
            </div>

            <button
              onClick={savePin}
              disabled={savingPin || !newPin || !confirmPin || (hasPin && !currentPin)}
              className="btn-primary w-full"
            >
              {savingPin ? 'Salvando...' : hasPin ? 'Alterar PIN' : 'Criar PIN'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-gold/10 rounded-lg text-sm text-gold">
            ⚠️ O PIN é necessário para realizar transferências internas.
            Guarde-o em local seguro!
          </div>
        </div>

        {/* Account Info */}
        <div className="glass-card p-6">
          <h2 className="font-orbitron text-lg mb-6">Informações da Conta</h2>

          <div className="space-y-4">
            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-text-secondary">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                user?.status === 'ACTIVE' ? 'bg-green-aurora/20 text-green-aurora' : 'bg-gold/20 text-gold'
              }`}>
                {user?.status === 'ACTIVE' ? 'Ativo' : 'Pendente'}
              </span>
            </div>

            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-text-secondary">Nível Atual</span>
              <span className="font-orbitron text-cyan">{user?.currentLevel || 1}</span>
            </div>

            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-text-secondary">Código de Indicação</span>
              <span className="font-mono text-gold">{user?.referralCode}</span>
            </div>

            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-text-secondary">Membro desde</span>
              <span>{user?.createdAt ? formatDate(user.createdAt) : '-'}</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-6 border border-red/30">
          <h2 className="font-orbitron text-lg mb-6 text-red">Zona de Perigo</h2>

          <div className="space-y-4">
            <div className="p-4 bg-red/10 rounded-xl">
              <h3 className="font-medium mb-2">Sair de Todos os Dispositivos</h3>
              <p className="text-sm text-text-secondary mb-3">
                Isso irá desconectar todas as sessões ativas em outros dispositivos.
              </p>
              <button className="px-4 py-2 bg-red/20 text-red rounded-lg hover:bg-red/30 transition-colors">
                Sair de Todos
              </button>
            </div>

            <div className="p-4 bg-red/10 rounded-xl">
              <h3 className="font-medium mb-2">Desativar Conta</h3>
              <p className="text-sm text-text-secondary mb-3">
                Sua conta será desativada e você perderá acesso. Esta ação requer confirmação.
              </p>
              <button className="px-4 py-2 bg-red/20 text-red rounded-lg hover:bg-red/30 transition-colors">
                Desativar Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
