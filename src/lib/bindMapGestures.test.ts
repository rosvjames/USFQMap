import { describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { MapGestureController } from './mapGestures'
import { bindMapGestures } from './bindMapGestures'

function setup() {
  const element = new EventTarget() as EventTarget & { setPointerCapture: (id: number) => void }
  element.setPointerCapture = vi.fn()
  const camera = new PerspectiveCamera(45, 0.5, 1, 4000), target = new Vector3()
  camera.position.set(0, 100, 100); camera.lookAt(target); camera.updateMatrixWorld()
  const orbit = { target, enabled: true, enableDamping: true, update: vi.fn() }
  const controller = new MapGestureController(camera, target, () => ({ left: 0, top: 0, width: 400, height: 800 }), { minDistance: 40, maxDistance: 1400, panLimit: 450 })
  const invalidate = vi.fn(), stopFlight = vi.fn()
  const dispose = bindMapGestures(element as unknown as HTMLElement, orbit, controller, invalidate, stopFlight)
  const pointer = (type: string, id: number, x = 200, y = 400, pointerType = 'touch') => {
    const event = Object.assign(new Event(type, { cancelable: true }), { pointerId: id, clientX: x, clientY: y, pointerType })
    element.dispatchEvent(event); return event
  }
  return { element, orbit, controller, camera, target, invalidate, stopFlight, dispose, pointer }
}

describe('native pointer ownership and tap selection', () => {
  it('takes touch ownership, schedules moves, and preserves taps for building selection', () => {
    const { orbit, pointer, stopFlight, invalidate, element, dispose } = setup()
    pointer('pointerdown', 1)
    expect(stopFlight).toHaveBeenCalledOnce(); expect(orbit.enabled).toBe(false)
    pointer('pointerup', 1)
    expect(orbit.enabled).toBe(true); expect(invalidate).toHaveBeenCalled()
    const tap = new Event('click', { cancelable: true }); element.dispatchEvent(tap)
    expect(tap.defaultPrevented).toBe(false)
    dispose()
  })
  it('does not raycast/select buildings while dragging or releasing a pinch', () => {
    const { pointer, controller, element, dispose } = setup()
    pointer('pointerdown', 1, 150); pointer('pointerdown', 2, 250)
    expect(pointer('pointermove', 2, 300).defaultPrevented).toBe(true)
    controller.flush(); pointer('pointerup', 2); pointer('pointerup', 1)
    const click = new Event('click', { cancelable: true }); element.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    dispose()
  })
  it.each(['pointercancel', 'lostpointercapture'])('recovers from %s and lets a new touch start normally', (type) => {
    const { pointer, orbit, controller, dispose } = setup()
    pointer('pointerdown', 1); pointer(type, 1)
    expect(orbit.enabled).toBe(true); expect(controller.active).toBe(false)
    pointer('pointerdown', 2); expect(controller.active).toBe(true)
    dispose(); expect(orbit.enabled).toBe(true); expect(controller.active).toBe(false)
  })
  it('leaves mouse input alone and removes its listeners on disposal', () => {
    const { pointer, orbit, stopFlight, dispose } = setup()
    pointer('pointerdown', 1, 200, 400, 'mouse')
    expect(orbit.enabled).toBe(true); expect(stopFlight).not.toHaveBeenCalled()
    dispose(); pointer('pointerdown', 2)
    expect(stopFlight).not.toHaveBeenCalled()
  })
})
