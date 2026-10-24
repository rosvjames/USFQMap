import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Vector3, type PerspectiveCamera } from 'three'
import { findCampusBuilding } from '../lib/campus'
import { moveWalkerOnSurface, walkingStart } from '../lib/walking'
import { terrainHeightAt } from '../lib/terrain'
import { HALL_ENTRANCE } from '../lib/hall'

import { clearWalkInput, type WalkAction, type WalkInput } from '../lib/walkInput'

const KEY_ACTION: Record<string, WalkAction> = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', KeyD: 'right', ArrowLeft: 'turnLeft', ArrowRight: 'turnRight',
}

export function WalkCamera({ buildingId, input, onExit }: { buildingId?: string; input: WalkInput; onExit: () => void }) {
  const { camera, gl, invalidate } = useThree()
  const keys = useRef(new Set<string>())
  const [start] = useState(() => walkingStart(buildingId))
  const position = useRef(start)
  const groundHeight = useRef(terrainHeightAt(start))
  const heading = useRef(0)
  const pitch = useRef(-0.05)

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const saved = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: cam.fov, near: cam.near }
    const target = !buildingId || buildingId === 'hall-principal' ? HALL_ENTRANCE.center : findCampusBuilding(buildingId)?.center
    if (!buildingId || buildingId === 'hall-principal') pitch.current = 0.07
    if (target) heading.current = Math.atan2(target[0] - position.current[0], target[1] - position.current[1])
    cam.fov = 65
    cam.near = 0.1
    cam.updateProjectionMatrix()
    const down = (event: KeyboardEvent) => {
      if (document.hidden || document.querySelector('dialog[open]')) return
      if (event.code === 'Escape') { onExit(); return }
      if ((event.target as HTMLElement)?.closest('input, select, textarea, button')) return
      const action = KEY_ACTION[event.code]
      if (action) { event.preventDefault(); keys.current.add(event.code); invalidate() }
    }
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code) }
    const clear = () => { keys.current.clear(); clearWalkInput(input.current); drag = null }
    const visibility = () => { if(document.hidden)clear() }
    let drag: { x: number; y: number; id: number } | null = null
    const pointerDown = (event: PointerEvent) => {
      if(event.button!==0 || drag)return
      drag = { x: event.clientX, y: event.clientY, id: event.pointerId }
      try { gl.domElement.setPointerCapture(event.pointerId) } catch { /* A cancelled touch has no capture. */ }
    }
    const pointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId!==drag.id) return
      heading.current += (event.clientX - drag.x) * 0.004
      pitch.current = Math.max(-0.65, Math.min(0.65, pitch.current - (event.clientY - drag.y) * 0.004))
      drag = { x: event.clientX, y: event.clientY, id: event.pointerId }
      invalidate()
    }
    const pointerUp = (event:PointerEvent) => { if(event.pointerId===drag?.id)drag = null }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', visibility)
    gl.domElement.tabIndex=0
    gl.domElement.focus({preventScroll:true})
    gl.domElement.addEventListener('pointerdown', pointerDown)
    gl.domElement.addEventListener('pointermove', pointerMove)
    gl.domElement.addEventListener('pointerup', pointerUp)
    gl.domElement.addEventListener('pointercancel', pointerUp)
    gl.domElement.addEventListener('lostpointercapture', pointerUp)
    invalidate()
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', visibility)
      gl.domElement.removeEventListener('pointerdown', pointerDown)
      gl.domElement.removeEventListener('pointermove', pointerMove)
      gl.domElement.removeEventListener('pointerup', pointerUp)
      gl.domElement.removeEventListener('pointercancel', pointerUp)
      gl.domElement.removeEventListener('lostpointercapture', pointerUp)
      gl.domElement.removeAttribute('tabindex')
      clear()
      camera.position.copy(saved.position)
      camera.quaternion.copy(saved.quaternion)
      cam.fov = saved.fov
      cam.near = saved.near
      cam.updateProjectionMatrix()
      invalidate()
    }
  }, [camera, gl, invalidate, buildingId, input, onExit])

  useFrame((_, elapsed) => {
    if (document.hidden || document.querySelector('dialog[open]')) { keys.current.clear(); clearWalkInput(input.current); return }
    const dt = Math.min(elapsed, 0.05)
    const active = new Set([...keys.current].map(code=>KEY_ACTION[code]).concat([...input.current.actions]))
    heading.current += ((active.has('turnRight') ? 1 : 0) - (active.has('turnLeft') ? 1 : 0)) * dt * 1.4
    const forward = (active.has('forward') ? 1 : 0) - (active.has('back') ? 1 : 0) + input.current.movement[1]
    const side = (active.has('right') ? 1 : 0) - (active.has('left') ? 1 : 0) + input.current.movement[0]
    const speed = 4 * dt / Math.max(1, Math.hypot(forward, side))
    const angle = heading.current
    if (forward || side) {
      const walker = moveWalkerOnSurface(position.current, [
        (Math.sin(angle) * forward + Math.cos(angle) * side) * speed,
        (Math.cos(angle) * forward - Math.sin(angle) * side) * speed,
      ], groundHeight.current)
      position.current = walker.point; groundHeight.current = walker.height
    }
    const [x, y] = position.current
    const eye = groundHeight.current + 1.65
    camera.position.set(x, eye, -y)
    camera.lookAt(new Vector3(x + Math.sin(angle), eye + Math.tan(pitch.current), -y - Math.cos(angle)))
    // This mode uses continuous frames; the overview retains demand rendering.
  })
  return null
}
