import Dexie, { type EntityTable } from 'dexie'
import type { PantryItem, PlanEntry, Recipe } from './types'
import { SEED_RECIPES, seedPantry } from './seed'

// Local-first storage in the browser (IndexedDB). Works offline.
// Cross-device sync (Supabase) can be layered on later without changing the UI.
export const db = new Dexie('meal-prep') as Dexie & {
  pantry: EntityTable<PantryItem, 'id'>
  recipes: EntityTable<Recipe, 'id'>
  plan: EntityTable<PlanEntry, 'key'>
}

db.version(1).stores({
  pantry: '++id, name, category',
  recipes: '++id, name, region',
  plan: 'key, date',
})

db.on('populate', async (tx) => {
  await tx.table('recipes').bulkAdd(SEED_RECIPES)
  await tx.table('pantry').bulkAdd(seedPantry())
})
