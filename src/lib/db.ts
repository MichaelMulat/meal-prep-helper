import Dexie, { type EntityTable, type Transaction } from 'dexie'
import type { PantryItem, PlanEntry, Recipe } from './types'
import { SEED_RECIPES, seedPantry } from './seed'
import { uuid } from './uuid'

// Local-first storage in the browser (IndexedDB). Works offline.
// Every local write is recorded in `outbox`; src/lib/sync.ts pushes those to Supabase
// and pulls remote changes back in, so the UI only ever talks to Dexie.

export type SyncedTable = 'recipes' | 'pantry' | 'plan'
export const SYNCED_TABLES: SyncedTable[] = ['recipes', 'pantry', 'plan']
export const PRIMARY_KEY: Record<SyncedTable, 'id' | 'key'> = { recipes: 'id', pantry: 'id', plan: 'key' }

export interface OutboxEntry {
  seq?: number
  table: SyncedTable
  key: string
  op: 'upsert' | 'delete'
}

export interface Meta {
  key: string
  value: unknown
}

export const db = new Dexie('meal-prep-sync') as Dexie & {
  pantry: EntityTable<PantryItem, 'id'>
  recipes: EntityTable<Recipe, 'id'>
  plan: EntityTable<PlanEntry, 'key'>
  outbox: EntityTable<OutboxEntry, 'seq'>
  meta: EntityTable<Meta, 'key'>
}

db.version(1).stores({
  pantry: 'id, name, category',
  recipes: 'id, name, region',
  plan: 'key, date',
  outbox: '++seq, table',
  meta: 'key',
})

db.on('populate', async (tx) => {
  markRemote(tx)
  await tx.table('recipes').bulkAdd(SEED_RECIPES)
  await tx.table('pantry').bulkAdd(seedPantry())
})

// Writes made inside a transaction marked this way (seeding, applying remote changes)
// are not queued for upload.
const REMOTE = Symbol('remote')
type Tagged = Transaction & { [REMOTE]?: boolean }

export function markRemote(tx: Transaction) {
  ;(tx as Tagged)[REMOTE] = true
}

let onChange: () => void = () => {}
export function setChangeListener(fn: () => void) {
  onChange = fn
}

const queued = new WeakMap<Transaction, OutboxEntry[]>()

function record(tx: Transaction, table: SyncedTable, key: unknown, op: OutboxEntry['op']) {
  if ((tx as Tagged)[REMOTE]) return
  let list = queued.get(tx)
  if (!list) {
    const entries: OutboxEntry[] = (list = [])
    queued.set(tx, entries)
    // Hooks can only touch the tables in their own transaction, so queue after it commits.
    tx.on('complete', () => void db.outbox.bulkAdd(entries).then(() => onChange()))
  }
  list.push({ table, key: String(key), op })
}

for (const name of SYNCED_TABLES) {
  const table = db.table(name)
  const pk = PRIMARY_KEY[name]
  table.hook('creating', function (_primKey, obj, tx) {
    if (obj[pk] == null) obj[pk] = uuid()
    record(tx, name, obj[pk], 'upsert')
    return obj[pk]
  })
  table.hook('updating', function (_mods, primKey, _obj, tx) {
    record(tx, name, primKey, 'upsert')
  })
  table.hook('deleting', function (primKey, _obj, tx) {
    record(tx, name, primKey, 'delete')
  })
}

/** One-time copy from the pre-sync database ('meal-prep'), which used numeric ids. */
export async function importLegacyData() {
  if (await db.meta.get('legacyImported')) return
  if (await Dexie.exists('meal-prep')) {
    const old = new Dexie('meal-prep')
    await old.open()
    const [recipes, pantry, plan] = await Promise.all([
      old.table('recipes').toArray(),
      old.table('pantry').toArray(),
      old.table('plan').toArray(),
    ])
    old.close()

    // Keep the fixed seed ids where names match, so devices that both started from the
    // seed data merge instead of duplicating it.
    const seedRecipeId = new Map(SEED_RECIPES.map((r) => [r.name, r.id!]))
    const seedPantryId = new Map(seedPantry().map((p) => [p.name, p.id!]))
    const recipeId = new Map<number, string>()
    const newRecipes: Recipe[] = recipes.map((r) => {
      const id = seedRecipeId.get(r.name) ?? uuid()
      recipeId.set(r.id, id)
      return { ...r, id }
    })
    const newPantry: PantryItem[] = pantry.map((p) => ({ ...p, id: seedPantryId.get(p.name) ?? uuid() }))
    const newPlan: PlanEntry[] = plan
      .filter((p) => recipeId.has(p.recipeId))
      .map((p) => ({ ...p, recipeId: recipeId.get(p.recipeId)! }))

    await db.transaction('rw', db.recipes, db.pantry, db.plan, async (tx) => {
      markRemote(tx)
      await Promise.all([db.recipes.clear(), db.pantry.clear(), db.plan.clear()])
      await db.recipes.bulkAdd(newRecipes)
      await db.pantry.bulkAdd(newPantry)
      await db.plan.bulkAdd(newPlan)
    })
  }
  await db.meta.put({ key: 'legacyImported', value: true })
}
