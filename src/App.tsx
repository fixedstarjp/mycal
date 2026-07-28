import { useCallback, useEffect, useState } from 'react'
import { addWeeks } from 'date-fns'
import MonthView from './components/MonthView'
import WeekView from './components/WeekView'
import DayDetail from './components/DayDetail'
import SearchView from './components/SearchView'
import TodoView from './components/TodoView'
import Settings from './components/Settings'
import Login from './components/Login'
import { useAppData, newId, repo } from './useAppData'
import { useAuth } from './useAuth'
import { isSupabaseMode } from './data/supabaseClient'
import { fetchWeather, type TempsByDate } from './lib/weather'
import { checkPresence, type Transition } from './lib/location'
import { OUTING_FIELD_KEY, OUTING_LAYER_NAME } from './data/seed'
import { roundTime5, todayStr } from './lib/dates'

type View = 'month' | 'week' | 'todo' | 'search' | 'settings'

interface NavItem {
  key: View
  label: string
  icon: string
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-1.5 text-[9px] ${
        active ? 'text-sky-400' : 'text-slate-500'
      }`}
    >
      <span className="text-base leading-none">{item.icon}</span>
      <span className="max-w-full truncate px-0.5">{item.label}</span>
    </button>
  )
}

// Supabaseモードではログイン後にのみデータ層(MainApp)をマウントする
export default function App() {
  const auth = useAuth()

  if (!auth.ready) {
    return <div className="mx-auto flex h-full max-w-3xl items-center justify-center bg-slate-900 text-slate-500">読み込み中...</div>
  }
  if (isSupabaseMode && !auth.session) {
    return <Login />
  }
  return <MainApp />
}

function MainApp() {
  const [view, setView] = useState<View>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [temps, setTemps] = useState<TempsByDate>({})

  const data = useAppData(anchor.getFullYear(), anchor.getMonth() + 1)

  const loadWeather = useCallback(async (force = false) => {
    try {
      setTemps(await fetchWeather(force))
    } catch {
      // 気温はオプション情報のため失敗しても他の表示は続行
    }
  }, [])

  useEffect(() => {
    loadWeather()
  }, [loadWeather])

  // 起動時に現在地を確認し、前回から自宅を出入りしていれば記録を提案する(半自動)
  const [outing, setOuting] = useState<Transition>(null)
  useEffect(() => {
    checkPresence().then(setOuting)
  }, [])

  async function recordOuting() {
    const kind = outing
    setOuting(null)
    if (!kind) return
    const layer = data.layers.find((l) => l.name === OUTING_LAYER_NAME && !l.archived)
    if (!layer) return
    await repo.saveLogEntry({
      id: newId(),
      layerId: layer.id,
      date: todayStr(),
      time: roundTime5(),
      data: { [OUTING_FIELD_KEY]: kind },
      note: '',
    })
    data.reload()
  }

  const nav: { key: View; label: string; icon: string }[] = [
    { key: 'month', label: 'カレンダー', icon: '📅' },
    { key: 'week', label: '週', icon: '📋' },
    { key: 'todo', label: 'ToDo', icon: '✅' },
    { key: 'search', label: '検索', icon: '🔍' },
    { key: 'settings', label: '設定', icon: '⚙️' },
  ]

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col bg-slate-900 pt-[env(safe-area-inset-top)] text-slate-200">
      {/* 外出/帰宅の検知バナー。時刻は「今」で記録される点を明示する */}
      {outing && (
        <div className="mx-2 mt-1 flex shrink-0 items-center gap-2 rounded-lg border border-sky-600/50 bg-sky-900/30 px-3 py-2">
          <span className="text-sm text-slate-200">
            📍 {outing}を検知
            <span className="ml-1 text-xs text-slate-400">({roundTime5()}時点)</span>
          </span>
          <button
            onClick={recordOuting}
            className="ml-auto shrink-0 rounded-full bg-sky-600 px-3 py-1 text-xs font-bold text-slate-900 active:bg-sky-500"
          >
            記録する
          </button>
          <button
            onClick={() => setOuting(null)}
            className="shrink-0 px-1 text-slate-500"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      )}

      <main className="min-h-0 flex-1">
        {view === 'month' ? (
          <MonthView
            anchor={anchor}
            data={data}
            temps={temps}
            onSelectDate={setSelectedDate}
            onMove={(d) => setAnchor((a) => addWeeks(a, d))}
          />
        ) : view === 'week' ? (
          <WeekView
            anchor={anchor}
            data={data}
            onSelectDate={setSelectedDate}
            onMove={(d) => setAnchor((a) => addWeeks(a, d))}
          />
        ) : view === 'todo' ? (
          <TodoView data={data} />
        ) : view === 'search' ? (
          <SearchView onSelectDate={setSelectedDate} />
        ) : (
          <Settings data={data} />
        )}
      </main>

      {/* 日詳細はボトムシートとして現在のビューの上に重ねる */}
      {selectedDate && (
        <DayDetail
          date={selectedDate}
          data={data}
          temps={temps}
          onBack={() => setSelectedDate(null)}
          onChangeDate={(d) => {
            setSelectedDate(d)
            // 月をまたいでもデータ範囲・背景の月が追従するようにする
            setAnchor(new Date(d + 'T00:00:00'))
          }}
        />
      )}

      <nav className="grid shrink-0 grid-cols-6 border-t border-slate-800 bg-slate-900 pb-[calc(env(safe-area-inset-bottom)*0.5)]">
        {nav.slice(0, 2).map((n) => (
          <NavButton key={n.key} item={n} active={view === n.key && !selectedDate} onClick={() => {
            setView(n.key)
            setSelectedDate(null)
            setAnchor(new Date())
          }} />
        ))}
        {/* 中央: ブラウザリロード(最新データ・気温・アプリ新バージョンをまとめて取り込む) */}
        <button
          onClick={() => window.location.reload()}
          className="flex flex-col items-center gap-0.5 py-1.5 text-[9px] text-slate-500 active:text-sky-400"
          aria-label="再読み込み"
        >
          <span className="text-base leading-none">🔄</span>
          更新
        </button>
        {nav.slice(2).map((n) => (
          <NavButton key={n.key} item={n} active={view === n.key && !selectedDate} onClick={() => {
            setView(n.key)
            setSelectedDate(null)
          }} />
        ))}
      </nav>
    </div>
  )
}
