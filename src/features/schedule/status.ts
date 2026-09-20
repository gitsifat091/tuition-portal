import type { BadgeTone } from '../../components/ui'
import { dateKeyOf } from '../../lib/time'
import type { SessionStatus } from '../../lib/types'
import type { SessionWithBatch } from './api'

export const STATUS_META: Record<SessionStatus, { label: string; tone: BadgeTone; bar: string }> = {
  scheduled: { label: 'Scheduled', tone: 'brand', bar: 'bg-brand-600' },
  rescheduled: { label: 'Rescheduled', tone: 'due', bar: 'bg-due' },
  extra: { label: 'Extra class', tone: 'extra', bar: 'bg-extra' },
  cancelled: { label: 'Cancelled', tone: 'cancelled', bar: 'bg-cancelled' },
}

/** Group classes by Bangladesh date, keeping order. */
export function groupByDay(sessions: SessionWithBatch[]): Map<string, SessionWithBatch[]> {
  const map = new Map<string, SessionWithBatch[]>()
  for (const s of sessions) {
    const key = dateKeyOf(s.starts_at)
    const list = map.get(key)
    if (list) list.push(s)
    else map.set(key, [s])
  }
  return map
}
