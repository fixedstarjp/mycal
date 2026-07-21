import { useEffect, useRef, useState, type CSSProperties } from 'react'

interface Options {
  onClose: () => void
  // 横フリック時に呼ばれる(左=+1、右=-1)。省略時は横フリック無効
  onSwipeHorizontal?: (dir: 1 | -1) => void
  closeThreshold?: number
  horizontalThreshold?: number
}

// ボトムシートの開閉アニメーションとジェスチャー制御。
// - 下から上にスライドして開く
// - 中身が先頭までスクロールされている時のみ、下フリックで閉じる
// - 最初に動いた方向で軸を固定し、横フリック(日送り等)と共存させる
export function useBottomSheet({
  onClose,
  onSwipeHorizontal,
  closeThreshold = 100,
  horizontalThreshold = 60,
}: Options) {
  const [entered, setEntered] = useState(false)
  const [closing, setClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragX, setDragX] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const axis = useRef<'h' | 'v' | null>(null)
  const canDragSheet = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function close() {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 250)
  }

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    axis.current = null
    canDragSheet.current = (scrollRef.current?.scrollTop ?? 0) <= 0
  }

  function onTouchMove(e: React.TouchEvent) {
    const t = e.touches[0]
    const dx = t.clientX - startX.current
    const dy = t.clientY - startY.current
    if (!axis.current) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (axis.current === 'v' && canDragSheet.current && dy > 0) setDragY(dy)
    // 横ドラッグ中は指に追従(日送りがあるときだけ)
    if (axis.current === 'h' && onSwipeHorizontal) setDragX(dx)
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = (e.changedTouches[0]?.clientX ?? startX.current) - startX.current
    if (axis.current === 'h') {
      if (onSwipeHorizontal && Math.abs(dx) > horizontalThreshold) {
        onSwipeHorizontal(dx < 0 ? 1 : -1)
      }
      setDragX(0)
    } else if (dragY > closeThreshold) {
      close()
    } else {
      setDragY(0)
    }
    axis.current = null
  }

  const open = entered && !closing
  const dragging = dragY > 0 || dragX !== 0
  const sheetStyle: CSSProperties = {
    transform: open ? `translate(${dragX * 0.4}px, ${dragY}px)` : 'translateY(100%)',
    transition: dragging ? 'none' : 'transform 0.25s ease-out',
  }

  return {
    open,
    close,
    scrollRef,
    sheetStyle,
    sheetHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
