import { useCallback, useEffect, useState } from 'react'
import { addWeeks } from 'date-fns'
import MonthView from './components/MonthView'
import DayDetail from './components/DayDetail'
import SearchView from './components/SearchView'
import TodoView from './components/TodoView'
import Settings from './components/Settings'
import Login from './components/Login'
import { useAppData, newId, repo } from './useAppData'
import { useAuth } from './useAuth'
import { isSupabaseMode } from './data/supabaseClient'
import { fetchWeather, type TempsByDate } from './lib/weather'
import { checkPresence, presenceMessage, type Transition } from './lib/location'
import { OUTING_FIELD_KEY, OUTING_LAYER_NAME } from './data/seed'
import { roundTime5, todayStr } from './lib/dates'

type View = 'month' | 'todo' | 'search' | 'settings'

// フッターの1マス。画面切り替え(active付き)と即時アクションの両方に使う
function NavButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: string
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-1.5 text-[9px] ${
        active ? 'text-sky-400' : 'text-slate-500 active:text-sky-400'
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="max-w-full truncate px-0.5">{label}</span>
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

  // 起動時に現在地を確認し、前回から自宅を出入りしていれば記録を提案する(半自動)。
  // フッターの「位置情報」からも同じチェックを手動で走らせられる
  const [outing, setOuting] = useState<Transition>(null)
  const [locMsg, setLocMsg] = useState('')

  const runPresenceCheck = useCallback(async (manual: boolean) => {
    if (manual) setLocMsg('現在地を確認中...')
    const r = await checkPresence()
    if (r.kind === 'transition') {
      setOuting(r.transition)
      setLocMsg('')
      return
    }
    // 起動時の自動チェックは、検知しなかったときは黙っている
    setLocMsg(manual ? presenceMessage(r) : '')
  }, [])

  useEffect(() => {
    runPresenceCheck(false)
  }, [runPresenceCheck])

  // 結果メッセージは数秒で自動的に消す(バナーが残り続けないように)
  useEffect(() => {
    if (!locMsg || locMsg.endsWith('確認中...')) return
    const t = setTimeout(() => setLocMsg(''), 5000)
    return () => clearTimeout(t)
  }, [locMsg])

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

  function openView(key: View) {
    setView(key)
    setSelectedDate(null)
    if (key === 'month') setAnchor(new Date())
  }

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

      {/* 手動チェックの結果。押しても無反応に見えないよう必ず表示する */}
      {locMsg && !outing && (
        <div className="mx-2 mt-1 flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2">
          <span className="text-sm text-slate-300">📍 {locMsg}</span>
          <button
            onClick={() => setLocMsg('')}
            className="ml-auto shrink-0 px-1 text-slate-500"
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
        <NavButton icon="📅" label="カレンダー" active={view === 'month' && !selectedDate} onClick={() => openView('month')} />
        <NavButton icon="✅" label="ToDo" active={view === 'todo' && !selectedDate} onClick={() => openView('todo')} />
        <NavButton icon="🔍" label="検索" active={view === 'search' && !selectedDate} onClick={() => openView('search')} />
        {/* 現在地を確認して外出/帰宅を判定する(結果は上部バナーに出る) */}
        <NavButton icon="📍" label="位置情報" onClick={() => runPresenceCheck(true)} />
        {/* ブラウザリロード(最新データ・気温・アプリ新バージョンをまとめて取り込む) */}
        <NavButton icon="🔄" label="更新" onClick={() => window.location.reload()} />
        <NavButton icon="⚙️" label="設定" active={view === 'settings' && !selectedDate} onClick={() => openView('settings')} />
      </nav>
    </div>
  )
}
