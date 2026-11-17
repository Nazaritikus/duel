const LAST_SECONDS_MS = 10_000

/** True in the last 10 s, when the active player's timer shows tenths. */
export function isLastSeconds(ms: number): boolean {
  return ms < LAST_SECONDS_MS
}

/**
 * Formats remaining time as `m:ss`, or `m:ss.t` with tenths. Always truncates, never rounds up,
 * so the shown time never exceeds the real remaining time.
 */
export function formatTime(ms: number, { tenths = false }: { tenths?: boolean } = {}): string {
  const totalTenths = Math.floor(Math.max(0, ms) / 100)
  const totalSeconds = Math.floor(totalTenths / 10)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  const base = `${minutes}:${seconds}`
  return tenths ? `${base}.${totalTenths % 10}` : base
}
