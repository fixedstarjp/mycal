import { useCallback, useEffect, useMemo, useState } from 'react'
import { LocalStorageRepository } from './data/localRepository'
import { SupabaseRepository } from './data/supabaseRepository'
import { supabase } from './data/supabaseClient'
import type { Repository } from './data/repository'
import type { GcalEvent, HabitEntry, Layer, LogEntry } from './types'
import { toDateStr } from './lib/dates'
import { addMonths, endOfMonth, startOfMonth } from 'date-fns'

// .env.localにSupabase接続情報があればSupabase、なければlocalStorage
export const repo: Repository = supabase
  ? new SupabaseRepository(supabase)
  : new LocalStorageRepository()

export interface AppData {
  layers: Layer[]
  habitEntries: HabitEntry[]
  logEntries: LogEntry[]
  gcalEvents: GcalEvent[]
  reload: () => void
}

// 表示中の月の前後1ヶ月分をまとめてロードする(月送り・週ビューをカバー)
export function useAppData(anchorYear: number, anchorMonth: number): AppData {
  const [layers, setLayers] = useState<Layer[]>([])
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [gcalEvents, setGcalEvents] = useState<GcalEvent[]>([])
  const [tick, setTick] = useState(0)

  const range = useMemo(() => {
    const anchor = new Date(anchorYear, anchorMonth - 1, 1)
    return {
      from: toDateStr(startOfMonth(addMonths(anchor, -1))),
      to: toDateStr(endOfMonth(addMonths(anchor, 1))),
    }
  }, [anchorYear, anchorMonth])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [ls, hs, lgs, evs] = await Promise.all([
        repo.getLayers(),
        repo.getHabitEntries(range.from, range.to),
        repo.getLogEntries(range.from, range.to),
        repo.getGcalEvents(range.from, range.to),
      ])
      if (cancelled) return
      setLayers(ls)
      setHabitEntries(hs)
      setLogEntries(lgs)
      setGcalEvents(evs)
    })()
    return () => {
      cancelled = true
    }
  }, [range, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { layers, habitEntries, logEntries, gcalEvents, reload }
}

export function newId(): string {
  return crypto.randomUUID()
}
