import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(47,0,255,0.15)_0%,transparent_70%)]" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="font-orbitron text-6xl md:text-8xl font-black gradient-text animate-pulse-glow">
              7iATLAS
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-2xl md:text-3xl text-text-secondary mb-4">
            A Solução que Veio do Cosmos
          </p>
          <p className="text-lg text-text-muted mb-8">
            Sistema de redistribuição de renda inspirado na física orbital
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login" className="btn-primary text-lg">
              🚀 Acessar Dashboard
            </Link>
            <Link href="/auth/register" className="btn-secondary text-lg">
              📝 Criar Conta
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-12 flex flex-wrap justify-center gap-8">
            <div className="text-center">
              <div className="font-orbitron text-3xl font-bold text-green-aurora">$10</div>
              <div className="text-text-muted text-sm">Entrada Única</div>
            </div>
            <div className="text-center">
              <div className="font-orbitron text-3xl font-bold text-gold">$20.460</div>
              <div className="text-text-muted text-sm">Ganho Potencial</div>
            </div>
            <div className="text-center">
              <div className="font-orbitron text-3xl font-bold text-cyan">10</div>
              <div className="text-text-muted text-sm">Níveis</div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="glass-card p-6">
              <div className="text-3xl mb-3">♾️</div>
              <h3 className="font-orbitron text-lg mb-2">Ciclos Infinitos</h3>
              <p className="text-text-secondary text-sm">
                Reentrada automática após cada ciclo. Uma entrada, ganhos ilimitados.
              </p>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl mb-3">💎</div>
              <h3 className="font-orbitron text-lg mb-2">Bônus 40%</h3>
              <p className="text-text-secondary text-sm">
                Ganhe 40% toda vez que um indicado ciclar. Para sempre.
              </p>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-orbitron text-lg mb-2">Blockchain BSC</h3>
              <p className="text-text-secondary text-sm">
                USDT-BEP20 na Binance Smart Chain. Transparência total.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-white/5">
        <p className="text-text-muted text-sm">
          7iATLAS © 2025 - &quot;Pirâmides caem. Órbitas giram para sempre.&quot;
        </p>
      </footer>
    </main>
  )
}
