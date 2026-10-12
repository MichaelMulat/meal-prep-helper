import type { RealtimeChannel, Session } from '@supabase/supabase-js'
import { db, markRemote, PRIMARY_KEY, setChangeListener, SYNCED_TABLES, type SyncedTable } from './db'
import { supabase } from './supabase'
import type { PantryItem, PlanEntry, Recipe } from './types'

// Two-way sync between Dexie and Supabase (schema: supabase/schema.sql).
// Push: outbox entries become upserts, or `deleted = true` tombstones.
// Pull: rows whose server-set updated_at is newer than the last pull. Rows with
// unpushed local edits are skipped, so the last write to reach the server wins.

type Row = Record<string, unknown>

interface SyncMeta {
  initialized: boolean
  since: Partial<Record<SyncedTable, string>>
}

export interface SyncState {
  configured: boolean
  email: string | null
  status: 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error'
  lastSynced: number | null
  error: string | null
}

let state: SyncState = { configured: !!supabase, email: null, status: 'signed-out', lastSynced: null, error: null }
const listeners = new Set<() => void>()
function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
export const syncStore = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => void listeners.delete(l)
  },
  get: () => state,
}

const PAGE = 1000
// Re-read a few seconds back on each pull: a write that commits late can carry an
// updated_at just before the newest row we already saw. Re-applying rows is harmless.
const OVERLAP_MS = 5000

function toRemote(table: SyncedTable, row: Row, userId: string): Row {
  if (table === 'recipes') {
    const r = row as unknown as Recipe
    return { user_id: userId, id: r.id, name: r.name, region: r.region, flavors: r.flavors, minutes: r.minutes, meals: r.meals, ingredients: r.ingredients, deleted: false }
  }
  if (table === 'pantry') {
    const p = row as unknown as PantryItem
    return { user_id: userId, id: p.id, name: p.name, quantity: p.quantity, unit: p.unit, category: p.category, expires: p.expires || null, deleted: false }
  }
  const p = row as unknown as PlanEntry
  return { user_id: userId, key: p.key, date: p.date, slot: p.slot, recipe_id: p.recipeId, deleted: false }
}

function fromRemote(table: SyncedTable, r: Row): Row {
  if (table === 'recipes') {
    const out: Recipe = { id: r.id as string, name: r.name as string, region: r.region as string, flavors: r.flavors as string[], minutes: r.minutes as number, meals: r.meals as Recipe['meals'], ingredients: r.ingredients as string[] }
    return out as unknown as Row
  }
  if (table === 'pantry') {
    const out: PantryItem = { id: r.id as string, name: r.name as string, quantity: Number(r.quantity), unit: r.unit as string, category: r.category as string, expires: (r.expires as string | null) ?? undefined }
    return out as unknown as Row
  }
  const out: PlanEntry = { key: r.key as string, date: r.date as string, slot: r.slot as PlanEntry['slot'], recipeId: r.recipe_id as string }
  return out as unknown as Row
}

// Postgres returns microseconds; trim to milliseconds so every browser can parse it.
function backdate(ts: string) {
  const ms = Date.parse(ts.replace(/(\.\d{3})\d+/, '$1'))
  return new Date(ms - OVERLAP_MS).toISOString()
}

async function fetchChanges(table: SyncedTable, userId: string, since?: string) {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase!.from(table).select('*').eq('user_id', userId)
    if (since) q = q.gt('updated_at', backdate(since))
    const { data, error } = await q.order('updated_at').order(PRIMARY_KEY[table]).range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

async function applyRemote(table: SyncedTable, rows: Row[]) {
  if (!rows.length) return
  const pk = PRIMARY_KEY[table]
  await db.transaction('rw', db.table(table), db.outbox, async (tx) => {
    markRemote(tx)
    const pending = new Set((await db.outbox.where('table').equals(table).toArray()).map((e) => e.key))
    const puts: Row[] = []
    const deletes: string[] = []
    for (const r of rows) {
      const key = r[pk] as string
      if (pending.has(key)) continue
      if (r.deleted) deletes.push(key)
      else puts.push(fromRemote(table, r))
    }
    await db.table(table).bulkDelete(deletes)
    await db.table(table).bulkPut(puts)
  })
}

async function upsert(table: SyncedTable, rows: Row[]) {
  if (!rows.length) return
  const { error } = await supabase!.from(table).upsert(rows, { onConflict: `user_id,${PRIMARY_KEY[table]}` })
  if (error) throw error
}

async function push(userId: string) {
  const entries = await db.outbox.orderBy('seq').toArray()
  if (!entries.length) return
  const latest = new Map(entries.map((e) => [`${e.table}|${e.key}`, e]))
  for (const table of SYNCED_TABLES) {
    const mine = [...latest.values()].filter((e) => e.table === table)
    const upsertKeys = mine.filter((e) => e.op === 'upsert').map((e) => e.key)
    const deletes = mine.filter((e) => e.op === 'delete').map((e) => e.key)
    const rows: Row[] = []
    const found = await db.table(table).bulkGet(upsertKeys)
    found.forEach((row, i) => (row ? rows.push(toRemote(table, row, userId)) : deletes.push(upsertKeys[i])))
    await upsert(table, rows)
    if (deletes.length) {
      const { error } = await supabase!.from(table).update({ deleted: true }).eq('user_id', userId).in(PRIMARY_KEY[table], deletes)
      if (error) throw error
    }
  }
  await db.outbox.bulkDelete(entries.map((e) => e.seq!))
}

// First sync for this user on this device: server copies win for rows both sides
// have, and rows only this device has are uploaded.
async function initialSync(userId: string): Promise<SyncMeta> {
  const last = await db.outbox.orderBy('seq').last()
  if (last) await db.outbox.where('seq').belowOrEqual(last.seq!).delete()
  const since: SyncMeta['since'] = {}
  for (const table of SYNCED_TABLES) {
    const remote = await fetchChanges(table, userId)
    await applyRemote(table, remote)
    if (remote.length) since[table] = remote[remote.length - 1].updated_at as string
    const pk = PRIMARY_KEY[table]
    const onServer = new Set(remote.map((r) => r[pk]))
    const local = (await db.table(table).toArray()) as Row[]
    await upsert(table, local.filter((r) => !onServer.has(r[pk])).map((r) => toRemote(table, r, userId)))
  }
  return { initialized: true, since }
}

async function pull(userId: string, meta: SyncMeta) {
  for (const table of SYNCED_TABLES) {
    const rows = await fetchChanges(table, userId, meta.since[table])
    await applyRemote(table, rows)
    if (rows.length) meta.since[table] = rows[rows.length - 1].updated_at as string
  }
}

async function cycle(userId: string) {
  const metaKey = `sync:${userId}`
  let meta = (await db.meta.get(metaKey))?.value as SyncMeta | undefined
  if (!meta?.initialized) meta = await initialSync(userId)
  else {
    await push(userId)
    await pull(userId, meta)
  }
  await db.meta.put({ key: metaKey, value: meta })
}

let userId: string | null = null
let running = false
let again = false

export async function syncNow() {
  if (!supabase || !userId) return
  if (!navigator.onLine) return setState({ status: 'offline' })
  if (running) {
    again = true
    return
  }
  running = true
  setState({ status: 'syncing', error: null })
  try {
    do {
      again = false
      await cycle(userId)
    } while (again && userId)
    setState({ status: userId ? 'idle' : 'signed-out', lastSynced: Date.now() })
  } catch (e) {
    console.error('Sync failed', e)
    setState({ status: 'error', error: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e) })
  } finally {
    running = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
function schedule(ms: number) {
  if (!userId) return
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), ms)
}

let channel: RealtimeChannel | null = null

function onSession(session: Session | null) {
  setState({ email: session?.user.email ?? null })
  const uid = session?.user.id ?? null
  if (uid === userId) return // token refresh etc.
  userId = uid
  if (channel) void supabase!.removeChannel(channel)
  channel = null
  if (!uid) return setState({ status: 'signed-out', lastSynced: null, error: null })
  channel = supabase!.channel(`sync:${uid}`)
  for (const table of SYNCED_TABLES) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${uid}` }, () => schedule(500))
  }
  channel.subscribe()
  schedule(0)
}

export function startSync() {
  if (!supabase) return
  setChangeListener(() => schedule(800))
  // Supabase warns against awaiting its own calls inside this callback, so defer.
  supabase.auth.onAuthStateChange((_event, session) => void setTimeout(() => onSession(session), 0))
  window.addEventListener('online', () => schedule(0))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && schedule(0))
  setInterval(() => schedule(0), 60_000)
}
