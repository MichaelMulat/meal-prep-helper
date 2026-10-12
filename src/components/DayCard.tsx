import { useDraggable, useDroppable } from '@dnd-kit/core'
import { fmtDate, fmtDay } from '../lib/dates'
import { MEAL_SLOTS, type MealSlot, type PlanEntry, type Recipe } from '../lib/types'
import { MatchBadge } from './RecipeCard'

interface Props {
  date: string
  isToday: boolean
  planByKey: Map<string, PlanEntry>
  byId: Map<string, Recipe>
  matches: Map<string, { have: number; total: number; ratio: number }>
  selected?: Recipe
  onPlace: (slot: MealSlot) => void
  onClear: (key: string) => void
}

export default function DayCard({ date, isToday, planByKey, byId, matches, selected, onPlace, onClear }: Props) {
  const minutes = MEAL_SLOTS.reduce((sum, s) => {
    const e = planByKey.get(`${date}|${s}`)
    return sum + (e ? (byId.get(e.recipeId)?.minutes ?? 0) : 0)
  }, 0)

  return (
    <div className={`flex flex-col rounded-2xl border bg-card p-2.5 ${isToday ? 'border-olive shadow-[0_0_0_1px_var(--color-olive)]' : 'border-line'}`}>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <div>
          <span className="font-display text-base font-semibold">{fmtDay(date)}</span>
          <span className="ml-1.5 text-xs text-muted">{fmtDate(date)}</span>
        </div>
        {minutes > 0 && <span className="text-[11px] tabular-nums text-muted">{minutes} min</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {MEAL_SLOTS.map((slot) => {
          const key = `${date}|${slot}`
          const entry = planByKey.get(key)
          const recipe = entry ? byId.get(entry.recipeId) : undefined
          return (
            <Slot
              key={slot}
              id={key}
              slot={slot}
              recipe={recipe}
              match={recipe ? matches.get(recipe.id!) : undefined}
              placing={!!selected}
              onPlace={() => onPlace(slot)}
              onClear={() => onClear(key)}
            />
          )
        })}
      </div>
    </div>
  )
}

interface SlotProps {
  id: string
  slot: MealSlot
  recipe?: Recipe
  match?: { have: number; total: number; ratio: number }
  placing: boolean
  onPlace: () => void
  onClear: () => void
}

function Slot({ id, slot, recipe, match, placing, onPlace, onClear }: SlotProps) {
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `slot:${id}` })
  const drag = useDraggable({ id: `plan:${id}`, disabled: !recipe })

  const label = <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{slot}</div>

  if (!recipe) {
    return (
      <button
        ref={dropRef}
        onClick={placing ? onPlace : undefined}
        className={`min-h-[64px] rounded-xl border border-dashed px-2.5 py-2 text-left transition ${
          isOver ? 'border-olive bg-olive-soft' : placing ? 'border-olive/60 bg-olive-soft/40 hover:bg-olive-soft' : 'border-line'
        } ${placing ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {label}
        <div className="mt-1 text-xs text-muted/70">{placing ? 'Tap to add' : 'Empty'}</div>
      </button>
    )
  }

  return (
    <div
      ref={(n) => {
        dropRef(n)
        drag.setNodeRef(n)
      }}
      onClick={placing ? onPlace : undefined}
      className={`group relative min-h-[64px] touch-manipulation rounded-xl px-2.5 py-2 transition select-none ${
        isOver ? 'bg-olive-soft ring-2 ring-olive' : 'bg-paper'
      } ${drag.isDragging ? 'opacity-40' : ''} ${placing ? 'cursor-pointer' : 'cursor-grab'}`}
      {...drag.attributes}
      {...drag.listeners}
    >
      {label}
      <div className="mt-0.5 pr-5 text-sm font-medium leading-snug">{recipe.name}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <span>{recipe.minutes} min</span>
        {match && <MatchBadge {...match} />}
      </div>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onClear()
        }}
        className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full text-muted opacity-60 hover:bg-tomato-soft hover:text-tomato hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={`Remove ${recipe.name}`}
      >
        ×
      </button>
    </div>
  )
}
