import { useRef, useState } from 'react'

// 横スワイプ検出(左=+1、右=-1)。
// ドラッグ中はdragXで指に追従させ、しきい値を超えて離すとonSwipeを呼ぶ。
// 縦方向の動きが大きい場合(スクロール)は反応しない
export function useHorizontalSwipe(onSwipe: (dir: 1 | -1) => void, threshold = 60) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const axis = useRef<'h' | 'v' | null>(null)
  const [dragX, setDragX] = useState(0)

  function onTouchStart(e: React.TouchEvent) {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    axis.current = null
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!start.current) return
    const dx = e.touches[0].clientX - start.current.x
    const dy = e.touches[0].clientY - start.current.y
    if (!axis.current) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (axis.current === 'h') setDragX(dx)
  }

  function onTouchEnd() {
    if (axis.current === 'h' && Math.abs(dragX) > threshold) {
      onSwipe(dragX < 0 ? 1 : -1)
    }
    setDragX(0)
    start.current = null
    axis.current = null
  }

  return {
    dragX,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
