import { useMemo, useState } from 'react'
import { db } from '../lib/db'
import { inPantry } from '../lib/match'
import type { PantryItem, PlanEntry, Recipe } from '../lib/types'

interface Props {
  plan: PlanEntry[]
  byId: Map<string, Recipe>
  pantry: PantryItem[]
}

export default function ShoppingList({ plan, byId, pantry }: Props) {
  const [copied, setCopied] = useState(false)

  const items = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of plan) {
      for (const ing of byId.get(p.recipeId)?.ingredients ?? []) {
        if (!inPantry(ing, pantry)) counts.set(ing, (counts.get(ing) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [plan, byId, pantry])

  if (!plan.length) return null

  const bought = (name: string) => db.pantry.add({ name, quantity: 1, unit: 'ct', category: 'Other' })

  async function copy() {
    await navigator.clipboard.writeText(items.map(([n]) => `• ${n}`).join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">Shopping list</h2>
          <p className="text-xs text-muted">Ingredients this week's meals need that aren't in your pantry.</p>
        </div>
        {items.length > 0 && (
          <button onClick={copy} className="text-sm font-medium text-olive hover:underline">
            {copied ? 'Copied' : 'Copy list'}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-olive">You have everything for this week's plan.</p>
      ) : (
        <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map(([name, n]) => (
            <li key={name} className="flex items-center gap-2 py-1 text-sm">
              <button
                onClick={() => bought(name)}
                className="grid size-5 shrink-0 place-items-center rounded border border-line hover:border-olive hover:bg-olive-soft"
                title="Bought it: add to pantry"
                aria-label={`Mark ${name} as bought`}
              />
              <span className="capitalize">{name}</span>
              {n > 1 && <span className="text-xs text-muted">×{n} meals</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
