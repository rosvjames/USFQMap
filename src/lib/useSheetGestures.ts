import { useEffect, useRef, type PointerEvent } from 'react'

// A downward drag longer than this dismisses the sheet; a shorter one springs back.
const DISMISS_DISTANCE = 70

/** Lets the user pull a bottom sheet down by its header, the gesture map apps use to close or fold it. */
export function useSwipeDown<T extends HTMLElement>(onDismiss: () => void) {
  const sheet = useRef<T>(null)
  const start = useRef<number | null>(null)
  const moved = useRef(false)
  const offset = (y: number) => sheet.current?.style.setProperty('--drag', `${Math.max(0, y)}px`)
  function release(dismiss: boolean) {
    start.current = null
    sheet.current?.classList.remove('dragging')
    offset(0)
    if (dismiss) onDismiss()
    // The click that follows this release still sees the drag; later keyboard presses must not.
    setTimeout(() => { moved.current = false })
  }
  return {
    sheet,
    /** True when the last press was a drag, so the grabber's click that follows it is ignored. */
    wasDragged: () => moved.current,
    handle: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0 || (event.target as HTMLElement).closest('a, input, select, button:not(.grabber)')) return
        start.current = event.clientY
        moved.current = false
        // Capturing on the header would retarget the grabber's click away from its button.
        const captureTarget = (event.target as HTMLElement).closest('.grabber') ?? event.currentTarget
        captureTarget.setPointerCapture(event.pointerId)
        sheet.current?.classList.add('dragging')
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        if (start.current === null) return
        if (Math.abs(event.clientY - start.current) > 6) moved.current = true
        offset(event.clientY - start.current)
      },
      onPointerUp(event: PointerEvent<HTMLElement>) {
        if (start.current !== null) release(event.clientY - start.current > DISMISS_DISTANCE)
      },
      onPointerCancel() {
        if (start.current !== null) release(false)
      },
    },
  }
}

/** Publishes how much of the layout the on-screen keyboard covers as --keyboard, so bottom sheets can rise above it. */
export function useKeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => document.documentElement.style.setProperty('--keyboard', `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`)
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])
}
