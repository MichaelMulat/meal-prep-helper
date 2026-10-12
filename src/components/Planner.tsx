import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { db } from '../lib/db'
import { addDays, fmtDate, startOfWeek, toISO, weekDates } from '../lib/dates'
import { pantryMatch } from '../lib/match'
import { MEAL_SLOTS, type MealSlot, type PlanEntry, type Recipe } from '../lib/types'
import RecipeLibrary, { type Filters } from './RecipeLibrary'
import DayCard from './DayCard'
import ShoppingList from './ShoppingList'

const NONE: never[] = []
const DEFAULT_FILTERS: Filters = { search: '', region: '', flavors: [], maxMinutes: 0, sort: 'match' }

export default function Planner() {
  const [monday, setMonday] = useState(() => startOfWeek(new Date()))
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragLabel, setDragLabel] = useState<string | null>(null)

  const dates = useMemo(() => weekDates(monday), [monday])
  const recipes = useLiveQuery(() => db.recipes.toArray(), []) ?? NONE
  const pantry = useLiveQuery(() => db.pantry.toArray(), []) ?? NONE
  const plan = useLiveQuery(() => db.plan.where('date').between(dates[0], dates[6], true, true).toArray(), [dates]) ?? NONE

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id!, r])), [recipes])
  const planByKey = useMemo(() => new Map(plan.map((p) => [p.key, p])), [plan])
  const matches = useMemo(() => new Map(recipes.map((r) => [r.id!, pantryMatch(r, pantry)])), [recipes, pantry])

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    const list = recipes.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.includes(q))) &&
        (!filters.region || r.region === filters.region) &&
        (!filters.flavors.length || filters.flavors.some((f) => r.flavors.includes(f))) &&
        (!filters.maxMinutes || r.minutes <= filters.maxMinutes),
    )
    return list.sort((a, b) =>
      filters.sort === 'time'
        ? a.minutes - b.minutes
        : filters.sort === 'name'
          ? a.name.localeCompare(b.name)
          : matches.get(b.id!)!.ratio - matches.get(a.id!)!.ratio || a.minutes - b.minutes,
    )
  }, [recipes, filters, matches])

  const selected = selectedId != null ? byId.get(selectedId) : undefined

  const place = (date: string, slot: MealSlot, recipeId: string) =>
    db.plan.put({ key: `${date}|${slot}`, date, slot, recipeId })
  const clearSlot = (key: string) => db.plan.delete(key)

  async function move(fromKey: string, date: string, slot: MealSlot) {
    const from = planByKey.get(fromKey)
    const toKey = `${date}|${slot}`
    if (!from || fromKey === toKey) return
    const target = planByKey.get(toKey)
    await db.transaction('rw', db.plan, async () => {
      await db.plan.delete(fromKey)
      await place(date, slot, from.recipeId)
      if (target) await place(from.date, from.slot, target.recipeId) // swap
    })
  }

  async function autoFill() {
    const used = new Set(plan.map((p) => p.recipeId))
    const entries: PlanEntry[] = []
    for (const date of dates) {
      for (const slot of MEAL_SLOTS) {
        const key = `${date}|${slot}`
        if (planByKey.has(key)) continue
        const pool = filtered.filter((r) => r.meals.includes(slot))
        if (!pool.length) continue
        const fresh = pool.filter((r) => !used.has(r.id!))
        const candidates = (fresh.length ? fresh : pool)
          .map((r) => ({ r, score: matches.get(r.id!)!.ratio + Math.random() * 0.5 }))
          .sort((a, b) => b.score - a.score)
        const pick: Recipe = candidates[0].r
        used.add(pick.id!)
        entries.push({ key, date, slot, recipeId: pick.id! })
      }
    }
    await db.plan.bulkPut(entries)
  }

  async function clearWeek() {
    if (!plan.length) return
    if (window.confirm('Clear every meal planned for this week?')) await db.plan.bulkDelete(plan.map((p) => p.key))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  )

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id)
    if (id.startsWith('recipe:')) setDragLabel(byId.get(id.slice(7))?.name ?? null)
    else if (id.startsWith('plan:')) setDragLabel(byId.get(planByKey.get(id.slice(5))?.recipeId ?? '')?.name ?? null)
  }

  function onDragEnd(e: DragEndEvent) {
    setDragLabel(null)
    if (!e.over) return
    const [date, slot] = String(e.over.id).slice(5).split('|') as [string, MealSlot]
    const id = String(e.active.id)
    if (id.startsWith('recipe:')) place(date, slot, id.slice(7))
    else if (id.startsWith('plan:')) move(id.slice(5), date, slot)
  }

  const today = toISO(new Date())
  const isThisWeek = dates.includes(today)

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragLabel(null)}>
      <div className="grid gap-5 md:grid-cols-[290px_1fr] lg:grid-cols-[320px_1fr]">
        <RecipeLibrary
          recipes={filtered}
          total={recipes.length}
          matches={matches}
          filters={filters}
          onFilters={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
        />

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setMonday(addDays(monday, -7))} className="grid size-9 place-items-center rounded-full border border-line bg-card hover:border-muted/50" aria-label="Previous week">‹</button>
              <div className="min-w-[10rem] text-center">
                <div className="font-display text-lg font-semibold leading-tight">
                  {fmtDate(dates[0])} – {fmtDate(dates[6])}
                </div>
                <div className="text-xs text-muted">{plan.length} of 21 meals planned</div>
              </div>
              <button onClick={() => setMonday(addDays(monday, 7))} className="grid size-9 place-items-center rounded-full border border-line bg-card hover:border-muted/50" aria-label="Next week">›</button>
              {!isThisWeek && (
                <button onClick={() => setMonday(startOfWeek(new Date()))} className="ml-1 text-sm font-medium text-olive hover:underline">This week</button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={clearWeek} className="rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-muted hover:text-tomato">Clear week</button>
              <button onClick={autoFill} className="rounded-full bg-tomato px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110" title="Fills empty slots from your filtered recipes, favoring what's in your pantry">
                Auto-fill empty slots
              </button>
            </div>
          </div>

          {selected && (
            <div className="sticky top-[64px] z-10 mb-3 flex items-center justify-between gap-3 rounded-xl border border-olive/30 bg-olive-soft px-4 py-2.5 text-sm">
              <span>Tap an empty slot to add <strong>{selected.name}</strong></span>
              <button onClick={() => setSelectedId(null)} className="font-medium text-olive hover:underline">Done</button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dates.map((date) => (
              <DayCard
                key={date}
                date={date}
                isToday={date === today}
                planByKey={planByKey}
                byId={byId}
                matches={matches}
                selected={selected}
                onPlace={(slot) => selected && place(date, slot, selected.id!)}
                onClear={clearSlot}
              />
            ))}
          </div>

          <ShoppingList plan={plan} byId={byId} pantry={pantry} />
        </section>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragLabel && (
          <div className="rounded-xl border border-olive bg-card px-3 py-2 text-sm font-medium shadow-lg">{dragLabel}</div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
