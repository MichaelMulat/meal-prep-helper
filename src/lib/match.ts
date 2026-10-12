import type { PantryItem, Recipe } from './types'

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** True if `a` equals `b` or ends with ` b` (so "red onion" matches "onion", but "rice noodles" does not match "rice"). */
const endsWithWord = (a: string, b: string) => a === b || a.endsWith(' ' + b)

export function inPantry(ingredient: string, pantry: PantryItem[]): boolean {
  const ing = norm(ingredient)
  return pantry.some((p) => {
    if (p.quantity <= 0) return false
    const name = norm(p.name)
    return endsWithWord(ing, name) || endsWithWord(name, ing)
  })
}

export function pantryMatch(recipe: Recipe, pantry: PantryItem[]) {
  const missing = recipe.ingredients.filter((i) => !inPantry(i, pantry))
  const total = recipe.ingredients.length
  return { have: total - missing.length, total, ratio: total ? (total - missing.length) / total : 0, missing }
}
