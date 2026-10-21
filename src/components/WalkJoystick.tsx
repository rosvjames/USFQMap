import { useEffect, useRef } from 'react'
import { joystickMovement, type WalkInput } from '../lib/walkInput'

const RADIUS=30
/** Own one pointer, leaving a second finger free to drag the scene and turn the camera. */
export function WalkJoystick({input}:{input:WalkInput}) {
  const base=useRef<HTMLDivElement>(null)
  const pointer=useRef<number|null>(null)
  function reset() {
    pointer.current=null;input.current.movement=[0,0]
    base.current?.style.setProperty('--stick-x','0px');base.current?.style.setProperty('--stick-y','0px')
  }
  function move(x:number,y:number) {
    const rect=base.current!.getBoundingClientRect()
    const axes=joystickMovement(x-rect.left-rect.width/2,y-rect.top-rect.height/2,RADIUS)
    input.current.movement=axes
    base.current!.style.setProperty('--stick-x',`${axes[0]*RADIUS}px`)
    base.current!.style.setProperty('--stick-y',`${-axes[1]*RADIUS}px`)
  }
  useEffect(()=>{
    const clear=()=>{pointer.current=null;input.current.movement=[0,0];base.current?.style.setProperty('--stick-x','0px');base.current?.style.setProperty('--stick-y','0px')}
    const visibility=()=>{if(document.hidden)clear()}
    window.addEventListener('blur',clear);document.addEventListener('visibilitychange',visibility)
    return ()=>{clear();window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility)}
  },[input])
  return <div className="walk-joystick" role="group" aria-label="Joystick para caminar">
    <div className="joystick-base" ref={base}
      onPointerDown={event=>{
        if(pointer.current!==null||event.button!==0)return
        event.preventDefault();event.stopPropagation();pointer.current=event.pointerId
        event.currentTarget.setPointerCapture(event.pointerId);move(event.clientX,event.clientY)
      }}
      onPointerMove={event=>{if(event.pointerId===pointer.current){event.preventDefault();move(event.clientX,event.clientY)}}}
      onPointerUp={event=>{if(event.pointerId===pointer.current)reset()}}
      onPointerCancel={event=>{if(event.pointerId===pointer.current)reset()}}
      onLostPointerCapture={event=>{if(event.pointerId===pointer.current)reset()}}
    ><span className="joystick-knob" aria-hidden="true"/></div>
    <span className="joystick-caption">Caminar</span>
  </div>
}
