import type { ReactNode } from 'react'
import { useBottomSheet } from '../hooks/useBottomSheet'

interface Props {
  title: ReactNode
  error?: string
  submitLabel?: string
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
}

// フォーム用の共通ボトムシート。下から上にスライドして開き、
// 下スワイプ・背景タップ・▼ボタンで閉じる。
// EventForm / LogEntryForm / レイヤー編集で共用する
export default function BottomModal({
  title,
  error,
  submitLabel = '保存',
  onClose,
  onSubmit,
  children,
}: Props) {
  const sheet = useBottomSheet({ onClose })

  return (
    <div className="fixed inset-0 z-50">
      {/* 背景: タップで閉じる */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-250 ${
          sheet.open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={sheet.close}
      />

      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90vh] w-full max-w-md flex-col rounded-t-2xl bg-slate-900 shadow-2xl"
        style={sheet.sheetStyle}
        {...sheet.sheetHandlers}
      >
        {/* ドラッグハンドル */}
        <div className="flex shrink-0 justify-center pb-1 pt-2">
          <span className="h-1 w-10 rounded-full bg-slate-700" />
        </div>

        <h2 className="flex shrink-0 items-center gap-2 px-4 pb-2 text-base font-bold text-slate-100">
          {title}
          <button
            onClick={sheet.close}
            className="ml-auto rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 active:bg-slate-700"
            aria-label="閉じる"
          >
            ▼
          </button>
        </h2>

        <div ref={sheet.scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4">
          {children}
        </div>

        <div className="shrink-0 p-4 pt-3">
          {error && <p className="mb-2 text-sm text-rose-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={sheet.close}
              className="flex-1 rounded-lg bg-slate-800 py-3 text-sm text-slate-300 active:bg-slate-700"
            >
              キャンセル
            </button>
            <button
              onClick={onSubmit}
              className="flex-1 rounded-lg bg-sky-600 py-3 text-sm font-bold text-white active:bg-sky-500"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
