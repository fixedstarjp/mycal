import type { FieldDef, LogEntry } from '../types'

// ログのフィールド値を、フォームの状態(チップ選択 values と その他自由入力 others)に分解する。
// 既存エントリの編集・テンプレ流用の両方で使う
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

// 記録の要約ラベル(例: "朝 / 白米,味噌汁")
export function entrySummary(fields: FieldDef[], entry: LogEntry): string {
  return fields
    .map((f) => entry.data[f.key])
    .filter((v) => v !== undefined && v !== '')
    .join(' / ')
}

// 直近の記録から「よく使うテンプレ」を作る。
// entriesは新しい順で渡す前提。内容が同じものは重複排除し、先頭からlimit件返す
export function recentTemplates(fields: FieldDef[], entries: LogEntry[], limit = 5): LogEntry[] {
  const seen = new Set<string>()
  const out: LogEntry[] = []
  for (const e of entries) {
    const sig = JSON.stringify(fields.map((f) => e.data[f.key] ?? ''))
    if (sig === JSON.stringify(fields.map(() => ''))) continue // 空は除外
    if (seen.has(sig)) continue
    seen.add(sig)
    out.push(e)
    if (out.length >= limit) break
  }
  return out
}
