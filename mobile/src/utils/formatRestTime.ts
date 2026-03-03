/**
 * Format milliseconds as mm:ss (e.g. 125000 -> "02:05").
 */
export function msToMmSs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Parse mm:ss or m:ss string to milliseconds. Returns null if invalid.
 */
export function mmSsToMs(value: string): number | null {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{1,3}):([0-5]?\d)$/)
  if (!match) return null
  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null
  const totalSeconds = minutes * 60 + seconds
  return totalSeconds * 1000
}

/** Format up to 4 digits as mm:ss as user types (e.g. "1234" -> "12:34", "1" -> "00:01"). */
export function formatDigitsToMmSs(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 4)
  if (d.length === 0) return '00:00'
  if (d.length === 1) return `00:0${d}`
  if (d.length === 2) return `00:${d}`
  if (d.length === 3) return `0${d[0]}:${d.slice(1)}`
  return `${d.slice(0, 2)}:${d.slice(2)}`
}

/** Extract digits from mm:ss for editing (e.g. "12:34" -> "1234"). */
export function parseMmSsToDigits(mmss: string): string {
  return mmss.replace(/\D/g, '').slice(0, 4)
}

/** Convert 1–4 digits to milliseconds (e.g. "1234" -> 12*60+34 sec in ms). */
export function digitsToMs(digits: string): number {
  const d = digits.replace(/\D/g, '').slice(0, 4)
  if (d.length === 0) return 0
  if (d.length === 1) return parseInt(d, 10) * 1000
  if (d.length === 2) return parseInt(d, 10) * 1000
  if (d.length === 3) return (parseInt(d[0], 10) * 60 + parseInt(d.slice(1), 10)) * 1000
  return (parseInt(d.slice(0, 2), 10) * 60 + parseInt(d.slice(2), 10)) * 1000
}
