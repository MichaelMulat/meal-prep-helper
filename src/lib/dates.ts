export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const shift = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - shift)
  return out
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

export function weekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => toISO(addDays(monday, i)))
}

export function daysUntil(iso: string): number {
  const today = fromISO(toISO(new Date()))
  return Math.round((fromISO(iso).getTime() - today.getTime()) / 86_400_000)
}

export const fmtDay = (iso: string) =>
  fromISO(iso).toLocaleDateString(undefined, { weekday: 'short' })
export const fmtDate = (iso: string) =>
  fromISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
