import { useState } from 'react'
import { FLAVORS, REGIONS, type Recipe } from '../lib/types'
import RecipeCard from './RecipeCard'

export interface Filters {
  search: string
  region: string
  flavors: string[]
  maxMinutes: number // 0 = any
  sort: 'match' | 'time' | 'name'
}

interface Props {
  recipes: Recipe[]
  total: number
  matches: Map<string, { have: number; total: number; ratio: number }>
  filters: Filters
  onFilters: (f: Filters) => void
  onReset: () => void
  selectedId: string | null
  onSelect: (id: string) => void
}

const TIMES = [0, 15, 30, 45]

export default function RecipeLibrary({ recipes, total, matches, filters, onFilters, onReset, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(true)
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch })
  const toggleFlavor = (f: string) =>
    set({ flavors: filters.flavors.includes(f) ? filters.flavors.filter((x) => x !== f) : [...filters.flavors, f] })
  const active = filters.search || filters.region || filters.flavors.length || filters.maxMinutes

  return (
    <aside className="md:sticky md:top-[76px] md:max-h-[calc(100vh-96px)] md:self-start md:overflow-y-auto md:pr-1">
      <div className="rounded-2xl border border-line bg-card/60 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Recipes</h2>
          <button onClick={() => setOpen(!open)} className="text-xs font-medium text-muted md:hidden">
            {open ? 'Hide' : 'Show'}
          </button>
        </div>

        {open && (
          <>
            <input
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              placeholder="Search name or ingredient"
              className="mt-3 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-olive"
            />

            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted">Region</label>
            <select
              value={filters.region}
              onChange={(e) => set({ region: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-olive"
            >
              <option value="">Any region</option>
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>

            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Flavor</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {FLAVORS.map((f) => (
                <button
                  key={f}
                  onClick={() => toggleFlavor(f)}
                  className={`rounded-full border px-2.5 py-1 text-xs capitalize transition ${
                    filters.flavors.includes(f) ? 'border-saffron bg-saffron-soft font-semibold' : 'border-line bg-card text-muted hover:text-ink'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Time available</div>
            <div className="mt-1 grid grid-cols-4 gap-1 rounded-lg border border-line bg-card p-1 text-xs">
              {TIMES.map((t) => (
                <button
                  key={t}
                  onClick={() => set({ maxMinutes: t })}
                  className={`rounded-md py-1.5 font-medium ${filters.maxMinutes === t ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}
                >
                  {t ? `≤${t}m` : 'Any'}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted">
              <span>
                {recipes.length} of {total}
                {active ? (
                  <button onClick={onReset} className="ml-2 font-medium text-olive hover:underline">Reset</button>
                ) : null}
              </span>
              <select
                value={filters.sort}
                onChange={(e) => set({ sort: e.target.value as Filters['sort'] })}
                className="bg-transparent font-medium text-ink outline-none"
              >
                <option value="match">Best pantry match</option>
                <option value="time">Quickest</option>
                <option value="name">A–Z</option>
              </select>
            </div>

            <p className="mt-2 text-[11px] leading-snug text-muted">Drag a recipe onto a day, or tap it, then tap a slot.</p>

            <div className="mt-3 max-h-[46vh] space-y-2 overflow-y-auto md:max-h-none md:overflow-visible">
              {recipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} match={matches.get(r.id!)!} selected={selectedId === r.id} onSelect={() => onSelect(r.id!)} />
              ))}
              {!recipes.length && <p className="py-6 text-center text-sm text-muted">No recipes match these filters.</p>}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
