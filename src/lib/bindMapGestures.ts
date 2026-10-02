import type { Vector3 } from 'three'
import type { MapGestureController } from './mapGestures'

type Controls = { target: Vector3; enabled: boolean; enableDamping: boolean; update: () => void }

/** Native pointer binding shared by touch devices; desktop input stays with MapControls. */
export function bindMapGestures(canvas: HTMLElement, orbit: Controls, gestures: MapGestureController, invalidate: () => void, stopFlight: () => void) {
  let suppressClickUntil = 0
  const isTouch = (event: PointerEvent) => event.pointerType === 'touch' || event.pointerType === 'pen'
  const down = (event: PointerEvent) => {
    if (!isTouch(event)) return
    stopFlight()
    if (!gestures.active) {
      suppressClickUntil = 0
      // Flush the mouse's remaining damping before taking direct ownership of the camera.
      orbit.enableDamping = false; orbit.update(); orbit.enabled = false
    }
    gestures.start(event.pointerId, event.clientX, event.clientY)
    try { canvas.setPointerCapture(event.pointerId) } catch { /* Pointer already canceled by the browser. */ }
    if (gestures.count > 1) { event.preventDefault(); event.stopImmediatePropagation() }
    invalidate()
  }
  const move = (event: PointerEvent) => {
    if (!gestures.has(event.pointerId)) return
    event.preventDefault(); event.stopImmediatePropagation()
    gestures.move(event.pointerId, event.clientX, event.clientY); invalidate()
  }
  const up = (event: PointerEvent) => {
    if (!gestures.has(event.pointerId)) return
    gestures.end(event.pointerId)
    if (gestures.dragged || event.type !== 'pointerup') {
      suppressClickUntil = performance.now() + 500
      event.preventDefault(); event.stopImmediatePropagation()
    }
    if (!gestures.active) { orbit.enabled = true; orbit.enableDamping = true }
    orbit.update(); invalidate()
  }
  const click = (event: MouseEvent) => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation() }
  }
  // Capture moves before R3F's building raycasts and before the desktop controls.
  canvas.addEventListener('pointerdown', down, { capture: true, passive: false })
  canvas.addEventListener('pointermove', move, { capture: true, passive: false })
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, up as EventListener, { capture: true, passive: false })
  canvas.addEventListener('click', click, true)
  return () => {
    gestures.cancel(); orbit.enabled = true; orbit.enableDamping = true
    canvas.removeEventListener('pointerdown', down, { capture: true }); canvas.removeEventListener('pointermove', move, { capture: true })
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.removeEventListener(name, up as EventListener, { capture: true })
    canvas.removeEventListener('click', click, { capture: true })
  }
}
