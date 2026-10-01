import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Vector3, type PerspectiveCamera } from 'three'
import { findCampusBuilding } from '../lib/campus'
import { moveWalker, walkingStart } from '../lib/walking'
import type { Vec2 } from '../types'

export type WalkAction = 'forward' | 'back' | 'left' | 'right' | 'turnLeft' | 'turnRight'
export interface WalkInput { current: Set<WalkAction> }
const KEY_ACTION: Record<string, WalkAction> = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', KeyD: 'right', ArrowLeft: 'turnLeft', ArrowRight: 'turnRight',
}

export function WalkCamera({ buildingId, lookAt, input, onExit }: { buildingId?: string; lookAt?: Vec2; input: WalkInput; onExit: () => void }) {
  const { camera, gl, invalidate } = useThree()
  const keys = useRef(new Set<WalkAction>())
  const [start] = useState(() => walkingStart(buildingId))
  const position = useRef(start)
  const heading = useRef(0)
  const pitch = useRef(-0.05)

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const saved = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: cam.fov, near: cam.near }
    const target = lookAt ?? findCampusBuilding(buildingId ?? 'hall-principal')?.center
    if (target) heading.current = Math.atan2(target[0] - position.current[0], target[1] - position.current[1])
    cam.fov = 65
    cam.near = 0.1
    cam.updateProjectionMatrix()
    const down = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return
      if (event.code === 'Escape') { onExit(); return }
      if ((event.target as HTMLElement)?.closest('input, select, textarea, button')) return
      const action = KEY_ACTION[event.code]
      if (action) { event.preventDefault(); keys.current.add(action); invalidate() }
    }
    const up = (event: KeyboardEvent) => { const action = KEY_ACTION[event.code]; if (action) keys.current.delete(action) }
    const clear = () => { keys.current.clear(); input.current.clear() }
    let drag: { x: number; y: number } | null = null
    const pointerDown = (event: PointerEvent) => {
      drag = { x: event.clientX, y: event.clientY }
      gl.domElement.setPointerCapture(event.pointerId)
    }
    const pointerMove = (event: PointerEvent) => {
      if (!drag) return
      heading.current += (event.clientX - drag.x) * 0.004
      pitch.current = Math.max(-0.65, Math.min(0.65, pitch.current - (event.clientY - drag.y) * 0.004))
      drag = { x: event.clientX, y: event.clientY }
      invalidate()
    }
    const pointerUp = () => { drag = null }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    gl.domElement.addEventListener('pointerdown', pointerDown)
    gl.domElement.addEventListener('pointermove', pointerMove)
    gl.domElement.addEventListener('pointerup', pointerUp)
    gl.domElement.addEventListener('pointercancel', pointerUp)
    invalidate()
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      gl.domElement.removeEventListener('pointerdown', pointerDown)
      gl.domElement.removeEventListener('pointermove', pointerMove)
      gl.domElement.removeEventListener('pointerup', pointerUp)
      gl.domElement.removeEventListener('pointercancel', pointerUp)
      clear()
      camera.position.copy(saved.position)
      camera.quaternion.copy(saved.quaternion)
      cam.fov = saved.fov
      cam.near = saved.near
      cam.updateProjectionMatrix()
      invalidate()
    }
  }, [camera, gl, invalidate, buildingId, lookAt, input, onExit])

  useFrame((_, elapsed) => {
    if (document.querySelector('dialog[open]')) { keys.current.clear(); input.current.clear(); return }
    const dt = Math.min(elapsed, 0.05)
    const active = new Set([...keys.current, ...input.current])
    heading.current += ((active.has('turnRight') ? 1 : 0) - (active.has('turnLeft') ? 1 : 0)) * dt * 1.4
    const forward = (active.has('forward') ? 1 : 0) - (active.has('back') ? 1 : 0)
    const side = (active.has('right') ? 1 : 0) - (active.has('left') ? 1 : 0)
    const speed = 4 * dt / Math.max(1, Math.hypot(forward, side))
    const angle = heading.current
    if (forward || side) position.current = moveWalker(position.current, [
      (Math.sin(angle) * forward + Math.cos(angle) * side) * speed,
      (Math.cos(angle) * forward - Math.sin(angle) * side) * speed,
    ])
    const [x, y] = position.current
    camera.position.set(x, 2.2, -y)
    camera.lookAt(new Vector3(x + Math.sin(angle), 2.2 + Math.tan(pitch.current), -y - Math.cos(angle)))
    // This mode uses continuous frames; the overview retains demand rendering.
  })
  return null
}
