import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { daysUntil, fmtDate } from '../lib/dates'
import { PANTRY_CATEGORIES, type PantryItem } from '../lib/types'

const NONE: never[] = []
const EMPTY = { name: '', quantity: '1', unit: 'ct', category: 'Produce', expires: '' }
const UNITS = ['ct', 'g', 'kg', 'oz', 'lb', 'ml', 'L', 'cup', 'can', 'jar', 'bag', 'bottle', 'bunch', 'head']

function ExpiryTag({ expires }: { expires?: string }) {
  if (!expires) return null
  const d = daysUntil(expires)
  const [text, tone] =
    d < 0 ? ['Expired', 'bg-tomato text-white']
    : d === 0 ? ['Expires today', 'bg-tomato-soft text-tomato']
    : d <= 3 ? [`${d}d left`, 'bg-saffron-soft text-[#8a6410]']
    : [`Use by ${fmtDate(expires)}`, 'text-muted']
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tone}`}>{text}</span>
}

export default function Pantry() {
  const items = useLiveQuery(() => db.pantry.orderBy('name').toArray(), []) ?? NONE
  const [form, setForm] = useState(EMPTY)
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, PantryItem[]>()
    for (const it of items) {
      if (q && !it.name.toLowerCase().includes(q)) continue
      const list = map.get(it.category) ?? []
      list.push(it)
      map.set(it.category, list)
    }
    return PANTRY_CATEGORIES.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as const)
  }, [items, query])

  const expiring = items.filter((i) => i.expires && daysUntil(i.expires) <= 3).length

  async function add(e: FormEvent) {
    e.preventDefault()
    const name = form.name.trim().toLowerCase()
    if (!name) return
    const existing = items.find((i) => i.name === name && i.unit === form.unit)
    const qty = Number(form.quantity) || 1
    if (existing) await db.pantry.update(existing.id!, { quantity: existing.quantity + qty, expires: form.expires || existing.expires })
    else await db.pantry.add({ name, quantity: qty, unit: form.unit, category: form.category, expires: form.expires || undefined })
    setForm({ ...EMPTY, category: form.category })
  }

  const bump = (it: PantryItem, delta: number) => db.pantry.update(it.id!, { quantity: Math.max(0, +(it.quantity + delta).toFixed(2)) })

  const input = 'rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-olive'

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Pantry</h2>
          <p className="text-sm text-muted">
            {items.length} items
            {expiring > 0 && <span className="text-tomato"> · {expiring} expiring soon</span>}
          </p>
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pantry" className={`${input} w-full sm:w-56`} />
      </div>

      <form onSubmit={add} className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-card p-3 sm:grid-cols-[1fr_70px_90px_150px_150px_auto]">
        <input className={`${input} col-span-2 sm:col-span-1`} placeholder="Add an item, e.g. basil" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={input} type="number" min="0" step="any" inputMode="decimal" aria-label="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <select className={input} aria-label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <select className={input} aria-label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {PANTRY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className={input} type="date" aria-label="Use by" title="Use-by date (optional)" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })} />
        <button className="col-span-2 rounded-lg bg-olive px-4 py-2 text-sm font-semibold text-paper hover:brightness-110 sm:col-span-1">Add</button>
      </form>

      <div className="mt-5 space-y-5">
        {groups.map(([cat, list]) => (
          <section key={cat}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{cat}</h3>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {list.map((it) => (
                <li key={it.id} className={`flex items-center gap-3 px-4 py-2.5 ${it.quantity <= 0 ? 'opacity-50' : ''}`}>
                  <span className="min-w-0 flex-1 truncate font-medium capitalize">{it.name}</span>
                  <ExpiryTag expires={it.expires} />
                  <div className="flex items-center rounded-full border border-line">
                    <button onClick={() => bump(it, -1)} className="grid size-8 place-items-center text-muted hover:text-ink" aria-label={`Use one ${it.name}`}>−</button>
                    <span className="min-w-[4.5rem] text-center text-sm tabular-nums">{it.quantity} {it.unit}</span>
                    <button onClick={() => bump(it, 1)} className="grid size-8 place-items-center text-muted hover:text-ink" aria-label={`Add one ${it.name}`}>+</button>
                  </div>
                  <button onClick={() => db.pantry.delete(it.id!)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-tomato-soft hover:text-tomato" aria-label={`Remove ${it.name}`}>×</button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length && <p className="py-10 text-center text-sm text-muted">{items.length ? 'Nothing matches that search.' : 'Your pantry is empty. Add what you have on hand above.'}</p>}
      </div>
    </div>
  )
}
