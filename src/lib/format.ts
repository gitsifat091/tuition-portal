/** 2026-09-19 -> 19 Sep 2026 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** 2026-09-01 -> Sep 2026 */
export function formatMonth(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00`)
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/** 1500 -> ৳1,500 */
export function formatTaka(amount: number | null | undefined): string {
  return `৳${(amount ?? 0).toLocaleString('en-IN')}`
}

/** Value for <input type="month"> from a date column: 2026-09-01 -> 2026-09 */
export function toMonthInput(value: string | null | undefined): string {
  return value ? value.slice(0, 7) : currentMonthInput()
}

/** Date column value from <input type="month">: 2026-09 -> 2026-09-01 */
export function fromMonthInput(value: string): string {
  return `${value}-01`
}

/** This month as 2026-09, in local time. */
export function currentMonthInput(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
