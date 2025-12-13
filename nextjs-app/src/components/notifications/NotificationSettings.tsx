'use client'

import { useEffect, useState } from 'react'

interface NotificationPreferences {
  notifyEmail: boolean
  notifyPush: boolean
  notifyOnQueueAdvance: boolean
  notifyOnCycle: boolean
  notifyOnBonus: boolean
  notifyOnTransfer: boolean
  notifyFrequency: 'INSTANT' | 'HOURLY' | 'DAILY'
}

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notifyEmail: true,
    notifyPush: false,
    notifyOnQueueAdvance: true,
    notifyOnCycle: true,
    notifyOnBonus: true,
    notifyOnTransfer: true,
    notifyFrequency: 'INSTANT',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)

  useEffect(() => {
    // Verifica suporte a Push
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true)
    }

    const fetchPreferences = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        const res = await fetch('/api/notifications?type=preferences', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (data.preferences) {
          setPreferences(data.preferences)
          setPushSubscribed(data.preferences.notifyPush)
        }
      } catch (err) {
        console.error('Erro ao carregar preferências:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      })

      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  const handlePushToggle = async () => {
    if (!pushSupported) return

    if (!preferences.notifyPush) {
      // Habilitar push
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          alert('Permissão negada para notificações')
          return
        }

        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })

        const token = localStorage.getItem('accessToken')
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(
                String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))
              ),
              auth: btoa(
                String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))
              ),
            },
            device: navigator.userAgent,
          }),
        })

        setPreferences((p) => ({ ...p, notifyPush: true }))
        setPushSubscribed(true)
      } catch (err) {
        console.error('Erro ao habilitar push:', err)
      }
    } else {
      // Desabilitar push
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        if (subscription) {
          const token = localStorage.getItem('accessToken')
          await fetch('/api/notifications/subscribe', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          })

          await subscription.unsubscribe()
        }

        setPreferences((p) => ({ ...p, notifyPush: false }))
        setPushSubscribed(false)
      } catch (err) {
        console.error('Erro ao desabilitar push:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-48"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-orbitron text-lg mb-6">Preferências de Notificação</h3>

      {/* Canais */}
      <div className="mb-6">
        <h4 className="text-sm text-text-secondary mb-3">Canais</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">📧</span>
              <div>
                <div className="font-medium">Email</div>
                <div className="text-xs text-text-secondary">
                  Receba atualizações por email
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifyEmail}
              onChange={(e) =>
                setPreferences((p) => ({ ...p, notifyEmail: e.target.checked }))
              }
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔔</span>
              <div>
                <div className="font-medium">Push Notification</div>
                <div className="text-xs text-text-secondary">
                  {pushSupported
                    ? 'Notificações em tempo real no navegador'
                    : 'Não suportado neste navegador'}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifyPush}
              onChange={handlePushToggle}
              disabled={!pushSupported}
              className="toggle"
            />
          </label>
        </div>
      </div>

      {/* Eventos */}
      <div className="mb-6">
        <h4 className="text-sm text-text-secondary mb-3">Eventos</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <div className="font-medium">Avanço na fila</div>
              <div className="text-xs text-text-secondary">
                Quando sua posição melhorar significativamente
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifyOnQueueAdvance}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  notifyOnQueueAdvance: e.target.checked,
                }))
              }
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <div className="font-medium">Ciclo completado</div>
              <div className="text-xs text-text-secondary">
                Quando você receber pagamento de um ciclo
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifyOnCycle}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  notifyOnCycle: e.target.checked,
                }))
              }
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <div className="font-medium">Bônus de indicação</div>
              <div className="text-xs text-text-secondary">
                Quando receber bônus de indicados
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifyOnBonus}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  notifyOnBonus: e.target.checked,
                }))
              }
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <div className="font-medium">Transferências</div>
              <div className="text-xs text-text-secondary">
                Quando receber ou enviar transferências
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifyOnTransfer}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  notifyOnTransfer: e.target.checked,
                }))
              }
              className="toggle"
            />
          </label>
        </div>
      </div>

      {/* Frequência */}
      <div className="mb-6">
        <h4 className="text-sm text-text-secondary mb-3">Frequência</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'INSTANT', label: 'Instantâneo' },
            { value: 'HOURLY', label: 'Resumo por hora' },
            { value: 'DAILY', label: 'Resumo diário' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                setPreferences((p) => ({
                  ...p,
                  notifyFrequency: opt.value as any,
                }))
              }
              className={`p-3 rounded-xl text-sm transition-colors ${
                preferences.notifyFrequency === opt.value
                  ? 'bg-gradient-to-r from-gradient-start to-gradient-mid'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Botão salvar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full py-3"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Salvando...
          </span>
        ) : saved ? (
          '✓ Salvo!'
        ) : (
          'Salvar Preferências'
        )}
      </button>
    </div>
  )
}
