import { useState } from 'react'
import { addMonths, addWeeks } from 'date-fns'
import MonthView from './components/MonthView'
import WeekView from './components/WeekView'
import DayDetail from './components/DayDetail'
import LayerManager from './components/LayerManager'
import Settings from './components/Settings'
import Login from './components/Login'
import { useAppData } from './useAppData'
import { useAuth } from './useAuth'
import { isSupabaseMode } from './data/supabaseClient'

type View = 'month' | 'week' | 'layers' | 'settings'

// Supabaseモードではログイン後にのみデータ層(MainApp)をマウントする
export default function App() {
  const auth = useAuth()

  if (!auth.ready) {
    return <div className="mx-auto flex h-dvh max-w-3xl items-center justify-center bg-slate-900 text-slate-500">読み込み中...</div>
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

  const data = useAppData(anchor.getFullYear(), anchor.getMonth() + 1)

  const nav: { key: View; label: string; icon: string }[] = [
    { key: 'month', label: '月', icon: '📅' },
    { key: 'week', label: '週', icon: '📋' },
    { key: 'layers', label: 'レイヤー', icon: '🗂️' },
    { key: 'settings', label: '設定', icon: '⚙️' },
  ]

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col bg-slate-900 text-slate-200">
      <main className="min-h-0 flex-1">
        {selectedDate ? (
          <DayDetail date={selectedDate} data={data} onBack={() => setSelectedDate(null)} />
        ) : view === 'month' ? (
          <MonthView
            year={anchor.getFullYear()}
            month={anchor.getMonth() + 1}
            data={data}
            onSelectDate={setSelectedDate}
            onMove={(d) => setAnchor((a) => addMonths(a, d))}
          />
        ) : view === 'week' ? (
          <WeekView
            anchor={anchor}
            data={data}
            onSelectDate={setSelectedDate}
            onMove={(d) => setAnchor((a) => addWeeks(a, d))}
          />
        ) : view === 'layers' ? (
          <LayerManager data={data} />
        ) : (
          <Settings data={data} />
        )}
      </main>

      <nav className="grid shrink-0 grid-cols-4 border-t border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)]">
        {nav.map((n) => (
          <button
            key={n.key}
            onClick={() => {
              setView(n.key)
              setSelectedDate(null)
              if (n.key === 'month' || n.key === 'week') setAnchor(new Date())
            }}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
              view === n.key && !selectedDate ? 'text-sky-400' : 'text-slate-500'
            }`}
          >
            <span className="text-base leading-none">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
