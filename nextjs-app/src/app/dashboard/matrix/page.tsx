'use client'

import { useState } from 'react'
import Link from 'next/link'
import AllLevelsStats from '@/components/matrix/AllLevelsStats'
import PositionCard from '@/components/matrix/PositionCard'
import QueueList from '@/components/matrix/QueueList'

export default function MatrixPage() {
  const [selectedLevel, setSelectedLevel] = useState(1)

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-card-solid border-r border-white/10 p-6 flex flex-col">
        <Link href="/dashboard" className="font-orbitron text-2xl gradient-text mb-8">
          7iATLAS
        </Link>

        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="nav-item">
            <span>🏠</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard/quotas" className="nav-item">
            <span>🎫</span>
            <span>Cotas</span>
          </Link>
          <Link href="/dashboard/matrix" className="nav-item active">
            <span>📊</span>
            <span>Matriz</span>
          </Link>
          <Link href="/dashboard/transfers" className="nav-item">
            <span>💸</span>
            <span>Transferências</span>
          </Link>
          <Link href="/dashboard/notifications" className="nav-item">
            <span>🔔</span>
            <span>Notificações</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-2xl font-bold">Visualização da Matriz</h1>
          <p className="text-text-secondary">
            Acompanhe as filas e estatísticas de todos os níveis
          </p>
        </div>

        {/* Estatísticas gerais */}
        <div className="mb-8">
          <AllLevelsStats />
        </div>

        {/* Suas posições */}
        <div className="mb-8">
          <h2 className="font-orbitron text-lg mb-4">Suas Posições</h2>
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <PositionCard key={level} level={level} showDetails={false} />
            ))}
          </div>
        </div>

        {/* Seletor de nível */}
        <div className="flex items-center gap-4 mb-4">
          <h2 className="font-orbitron text-lg">Fila do Nível</h2>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`w-10 h-10 rounded-lg font-orbitron font-bold text-sm transition-colors ${
                  selectedLevel === level
                    ? 'bg-gradient-to-r from-gradient-start to-gradient-mid'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Lista da fila */}
        <QueueList level={selectedLevel} />
      </main>
    </div>
  )
}
