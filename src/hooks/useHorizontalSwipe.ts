import { useRef } from 'react'

// 横スワイプ検出(左=+1、右=-1)。縦方向の動きが大きい場合は発火しない。
// 返り値をそのまま要素にスプレッドして使う
export function useHorizontalSwipe(onSwipe: (dir: 1 | -1) => void, threshold = 60) {
  const start = useRef<{ x: number; y: number } | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!start.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    start.current = null
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onSwipe(dx < 0 ? 1 : -1)
    }
  }

  return { onTouchStart, onTouchEnd }
}
