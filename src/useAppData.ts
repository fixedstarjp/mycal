import { useCallback, useEffect, useMemo, useState } from 'react'
import { LocalStorageRepository } from './data/localRepository'
import { SupabaseRepository } from './data/supabaseRepository'
import { supabase } from './data/supabaseClient'
import type { Repository } from './data/repository'
import type { AppEvent, GcalEvent, HabitEntry, Layer, LogEntry, Todo } from './types'
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
  events: AppEvent[]
  todos: Todo[]
  reload: () => void
}

// 表示中の月の前後1ヶ月分をまとめてロードする(月送り・週ビューをカバー)
export function useAppData(anchorYear: number, anchorMonth: number): AppData {
  const [layers, setLayers] = useState<Layer[]>([])
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [gcalEvents, setGcalEvents] = useState<GcalEvent[]>([])
  const [events, setEvents] = useState<AppEvent[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
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
      const [ls, hs, lgs, gevs, evs, tds] = await Promise.all([
        repo.getLayers(),
        repo.getHabitEntries(range.from, range.to),
        repo.getLogEntries(range.from, range.to),
        repo.getGcalEvents(range.from, range.to),
        repo.getEvents(range.from, range.to),
        // ToDoは件数が少ないので全件(期日なしも表示するため)
        repo.getTodos(),
      ])
      if (cancelled) return
      setLayers(ls)
      setHabitEntries(hs)
      setLogEntries(lgs)
      setGcalEvents(gevs)
      setEvents(evs)
      setTodos(tds)
    })()
    return () => {
      cancelled = true
    }
  }, [range, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { layers, habitEntries, logEntries, gcalEvents, events, todos, reload }
}

export function newId(): string {
  return crypto.randomUUID()
}
