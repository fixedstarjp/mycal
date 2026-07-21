// 予定に付けられる絵文字プリセット。設定画面から追加/削除できる。
// この端末のlocalStorageに保存される(端末ごとの設定)

const KEY = 'mycal.icon_presets'

export const DEFAULT_ICON_PRESETS = ['📌', '💼', '🍽️', '🏥', '✈️', '🎂', '🎉', '🏃', '📞', '🎬', '📚', '💇']

export function getIconPresets(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_ICON_PRESETS
    const list = JSON.parse(raw)
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_ICON_PRESETS
  } catch {
    return DEFAULT_ICON_PRESETS
  }
}

export function setIconPresets(list: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(list.filter(Boolean)))
}

export function addIconPreset(emoji: string): string[] {
  const cur = getIconPresets()
  const next = cur.includes(emoji) ? cur : [...cur, emoji]
  setIconPresets(next)
  return next
}

export function removeIconPreset(emoji: string): string[] {
  const next = getIconPresets().filter((e) => e !== emoji)
  setIconPresets(next)
  return next
}
