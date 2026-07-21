const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

// iOSのtime inputはstep(5分刻み)を無視し、幅の挙動も不安定なため、
// 時・分のセレクトで統一する(予定・ログ共通)
export default function TimeSelect({
  value,
  onChange,
  disabled = false,
  emptyLabel = '--',
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  emptyLabel?: string
}) {
  const [h, m] = value ? value.split(':') : ['', '']
  // 既存データが5分刻み以外でも選択肢に出す
  const minutes = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES
  // スマホ幅(375px)ではみ出さないよう、パディング控えめ+最小幅固定
  const cls =
    'w-[4.5rem] rounded-lg border border-slate-700 bg-slate-800 px-2 py-2.5 text-center text-base text-slate-200 disabled:opacity-40'
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <select
        value={h}
        disabled={disabled}
        onChange={(e) => {
          const nh = e.target.value
          onChange(nh === '' ? '' : `${nh}:${m || '00'}`)
        }}
        className={cls}
      >
        <option value="">{emptyLabel}</option>
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>
            {hh}
          </option>
        ))}
      </select>
      <span className="text-slate-500">:</span>
      <select
        value={m}
        disabled={disabled || h === ''}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        className={cls}
      >
        {h === '' && <option value="">--</option>}
        {minutes.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
    </span>
  )
}
