import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { syncNow, syncStore, type SyncState } from '../lib/sync'

const input = 'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-olive'
const primary = 'w-full rounded-lg bg-olive px-4 py-2 text-sm font-semibold text-paper hover:brightness-110 disabled:opacity-60'

const DOT: Record<SyncState['status'], string> = {
  'signed-out': 'bg-line',
  idle: 'bg-olive',
  syncing: 'bg-saffron animate-pulse',
  offline: 'bg-muted',
  error: 'bg-tomato',
}

function ago(ts: number | null) {
  if (!ts) return 'not yet'
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`
}

export default function SyncButton() {
  const sync = useSyncExternalStore(syncStore.subscribe, syncStore.get)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  if (!sync.configured) return null
  const signedIn = sync.status !== 'signed-out'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
        aria-expanded={open}
      >
        <span className={`size-2 rounded-full ${DOT[sync.status]}`} />
        <span className="hidden sm:inline">{signedIn ? 'Sync' : 'Sign in'}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-line bg-card p-4 shadow-lg">
          {signedIn ? <Account sync={sync} /> : <SignIn />}
        </div>
      )}
    </div>
  )
}

function Account({ sync }: { sync: SyncState }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-muted">Signed in as</p>
        <p className="truncate font-medium">{sync.email}</p>
      </div>
      <p>
        {sync.status === 'syncing' && 'Syncing…'}
        {sync.status === 'idle' && `Synced ${ago(sync.lastSynced)}`}
        {sync.status === 'offline' && 'Offline. Changes will sync when you reconnect.'}
        {sync.status === 'error' && <span className="text-tomato">Sync failed: {sync.error}</span>}
      </p>
      <div className="flex gap-2">
        <button onClick={() => void syncNow()} className={primary}>Sync now</button>
        <button onClick={() => void supabase!.auth.signOut()} className="w-full rounded-lg border border-line px-4 py-2 font-medium hover:bg-paper">
          Sign out
        </button>
      </div>
    </div>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase!.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(error.message)
  }

  async function google() {
    setBusy(true)
    setError(null)
    const { error } = await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) {
      setBusy(false)
      setError(error.message)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">Sign in to sync your pantry, recipes and plan across devices.</p>
      {!sent ? (
        <>
          <button onClick={() => void google()} disabled={busy} className={primary}>Continue with Google</button>
          <p className="text-center text-xs text-muted">or get a code by email</p>
          <form onSubmit={send} className="space-y-2">
            <input className={input} type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button disabled={busy} className="w-full rounded-lg border border-line px-4 py-2 font-medium hover:bg-paper disabled:opacity-60">
              {busy ? 'Sending…' : 'Email me a sign-in code'}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={verify} className="space-y-2">
          <p>Check {email} for a code, or open the link in that email on this device.</p>
          <input className={input} inputMode="numeric" autoComplete="one-time-code" placeholder="Code from the email" value={code} onChange={(e) => setCode(e.target.value)} />
          <button disabled={busy || !code.trim()} className={primary}>{busy ? 'Checking…' : 'Sign in'}</button>
          <button type="button" onClick={() => setSent(false)} className="w-full text-muted hover:text-ink">Use a different email</button>
        </form>
      )}
      {error && <p className="text-tomato">{error}</p>}
    </div>
  )
}
