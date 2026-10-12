import { useState } from 'react'
import Planner from './components/Planner'
import Pantry from './components/Pantry'

type Tab = 'plan' | 'pantry'

export default function App() {
  const [tab, setTab] = useState<Tab>('plan')

  return (
    <div className="min-h-full pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Meal Prep <span className="text-olive">Helper</span>
          </h1>
          <nav className="flex rounded-full border border-line bg-card p-1 text-sm">
            {(['plan', 'pantry'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 font-medium transition ${
                  tab === t ? 'bg-olive text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                {t === 'plan' ? 'Week plan' : 'Pantry'}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        {tab === 'plan' ? <Planner /> : <Pantry />}
      </main>
    </div>
  )
}
