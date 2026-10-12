import { useDraggable } from '@dnd-kit/core'
import type { Recipe } from '../lib/types'

interface Props {
  recipe: Recipe
  match: { have: number; total: number; ratio: number }
  selected: boolean
  onSelect: () => void
}

export function MatchBadge({ have, total, ratio }: { have: number; total: number; ratio: number }) {
  const tone = ratio >= 0.75 ? 'bg-olive-soft text-olive' : ratio >= 0.4 ? 'bg-saffron-soft text-[#8a6410]' : 'bg-tomato-soft text-tomato'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`} title="Ingredients you already have">
      {have}/{total} on hand
    </span>
  )
}

export default function RecipeCard({ recipe, match, selected, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `recipe:${recipe.id}` })
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`w-full touch-manipulation rounded-xl border bg-card p-3 text-left transition select-none ${
        selected ? 'border-olive ring-2 ring-olive/30' : 'border-line hover:border-muted/50'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium leading-snug">{recipe.name}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted">{recipe.minutes} min</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <span>{recipe.region}</span>
        <span aria-hidden>·</span>
        <span>{recipe.flavors.join(', ')}</span>
      </div>
      <div className="mt-2">
        <MatchBadge {...match} />
      </div>
    </button>
  )
}
