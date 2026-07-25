import type { FieldDef, LogEntry } from '../types'

// ログのフィールド値を、フォームの状態(チップ選択 values と その他自由入力 others)に分解する
export function splitData(
  fields: FieldDef[],
  data: Record<string, string | number> | undefined,
): { values: Record<string, string>; others: Record<string, string> } {
  const values: Record<string, string> = {}
  const others: Record<string, string> = {}
  for (const f of fields) {
    const v = data?.[f.key]
    if (f.type === 'multiselect') {
      const list = v !== undefined ? String(v).split(',') : []
      values[f.key] = list.filter((o) => f.options?.includes(o)).join(',')
      others[f.key] = list.filter((o) => !f.options?.includes(o)).join(',')
    } else {
      values[f.key] = v !== undefined ? String(v) : f.type === 'select' ? (f.options?.[0] ?? '') : ''
    }
  }
  return { values, others }
}

// 過去のログから、multiselectの各項目が「どの時間帯(select値)で何回選ばれたか」を数える。
// 返り値: { slot値: { 食材: 回数 } }。slotKeyがnullなら全体を '' バケットに集計
export function optionFrequency(
  entries: LogEntry[],
  contentKey: string,
  slotKey: string | null,
): Record<string, Record<string, number>> {
  const map: Record<string, Record<string, number>> = {}
  for (const e of entries) {
    const slot = slotKey ? String(e.data[slotKey] ?? '') : ''
    const raw = e.data[contentKey]
    if (raw === undefined) continue
    const items = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    map[slot] ??= {}
    for (const it of items) map[slot][it] = (map[slot][it] ?? 0) + 1
  }
  return map
}

// 選択肢を、指定した時間帯での「よく食べる順」に並べ替える(回数が多い順、同数は元の順)
export function orderOptions(options: string[], freqForSlot: Record<string, number> | undefined): string[] {
  if (!freqForSlot) return options
  return options
    .map((o, i) => ({ o, i, n: freqForSlot[o] ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.o)
}
