// Date and time helpers for the schedule.
// Every class happens in Bangladesh time (Asia/Dhaka, UTC+6, no daylight
// saving), so all display and input uses that zone, whatever the device says.
// "Date keys" are plain YYYY-MM-DD strings; date arithmetic on them is done in
// UTC so the browser's own time zone can never shift a day.

export const TZ = 'Asia/Dhaka'
const OFFSET = '+06:00'

/** 0 = Sunday ... 6 = Saturday (same as Postgres and JavaScript). */
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Weeks start on Saturday, as in most Bangladeshi schools. */
export const WEEK_START = 6
/** Weekdays in display order, starting from WEEK_START. */
export const WEEKDAY_ORDER = Array.from({ length: 7 }, (_, i) => (WEEK_START + i) % 7)

const dateKeyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeInputFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Bangladesh calendar date of a timestamp: 2026-09-20T10:00:00Z -> 2026-09-20 */
export function dateKeyOf(value: string | Date): string {
  return dateKeyFormat.format(typeof value === 'string' ? new Date(value) : value)
}

/** Today in Bangladesh as 2026-09-20. */
export function todayKey(): string {
  return dateKeyOf(new Date())
}

/** Bangladesh clock time of a timestamp for <input type="time">: 16:30 */
export function timeInputOf(value: string): string {
  return timeInputFormat.format(new Date(value))
}

/** Timestamp for the database from a date key and a clock time (16:30 or 16:30:00). */
export function toTimestamp(dateKey: string, time: string): string {
  return `${dateKey}T${time.slice(0, 5)}:00${OFFSET}`
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(key: string, days: number): string {
  const date = parseKey(key)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function weekdayOf(key: string): number {
  return parseKey(key).getUTCDay()
}

/** The Saturday (WEEK_START) on or before this date. */
export function startOfWeek(key: string): string {
  return addDays(key, -((weekdayOf(key) - WEEK_START + 7) % 7))
}

/** 16:30:00 -> 4:30 pm */
export function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h < 12 ? 'am' : 'pm'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

/** Bangladesh clock time of a timestamp: 4:30 pm */
export function formatTimeOf(value: string): string {
  return formatClock(timeInputOf(value))
}

/** 2026-09-20 -> Sun 20 Sep (add the year with withYear) */
export function formatDayKey(key: string, withYear = false): string {
  return parseKey(key).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

/** Today, Tomorrow, or Sun 20 Sep */
export function relativeDay(key: string): string {
  const today = todayKey()
  if (key === today) return 'Today'
  if (key === addDays(today, 1)) return 'Tomorrow'
  if (key === addDays(today, -1)) return 'Yesterday'
  return formatDayKey(key)
}

/** Timestamp -> Sun 20 Sep, 4:30 pm */
export function formatWhen(value: string): string {
  return `${formatDayKey(dateKeyOf(value))}, ${formatTimeOf(value)}`
}

/** Week starting 2026-09-19 -> 19 to 25 Sep 2026 (or 26 Sep to 2 Oct 2026) */
export function formatWeekRange(startKey: string): string {
  const start = parseKey(startKey)
  const end = parseKey(addDays(startKey, 6))
  const day = (d: Date) => d.getUTCDate()
  const month = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'short' })
  const year = end.getUTCFullYear()
  if (start.getUTCMonth() === end.getUTCMonth()) return `${day(start)} to ${day(end)} ${month(end)} ${year}`
  const startYear = start.getUTCFullYear() !== year ? ` ${start.getUTCFullYear()}` : ''
  return `${day(start)} ${month(start)}${startYear} to ${day(end)} ${month(end)} ${year}`
}
