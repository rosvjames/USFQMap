import type { WalkInput } from '../lib/walkInput'
import { ANIMAL_ROUTES, type CampusAnimalId } from '../lib/campusAnimals'
import { WalkJoystick } from './WalkJoystick'

export function WalkControls({input,onExit,nearbyAnimal}:{input:WalkInput;onExit:()=>void;nearbyAnimal:CampusAnimalId|null}) {
  return <>
    <section className="walking-banner" aria-label="Exploración a pie">
      <span className="status-tag">Recorrido exterior</span>
      <h1>Camina por la universidad</h1>
      <p className="walk-hint-desktop">WASD para caminar · flechas para girar<br/>Arrastra para mirar · Esc para volver</p>
      <p className="walk-hint-mobile">Joystick para caminar · arrastra para mirar</p>
      <button onClick={onExit}>Volver al mapa <span aria-hidden="true">↗</span></button>
    </section>
    <WalkJoystick input={input}/>
    {nearbyAnimal && <div className="pet-hint" role="status"><span className="walk-hint-desktop"><kbd>E</kbd> Acariciar a {ANIMAL_ROUTES[nearbyAnimal].name}</span><span className="walk-hint-mobile">Toca a {ANIMAL_ROUTES[nearbyAnimal].name} para acariciarlo</span></div>}
    <div className="crosshair" aria-hidden="true">＋</div>
    <nav className="walk-pad" aria-label="Controles para caminar">
      {([
        ['turnLeft','↶','Girar a la izquierda'],['forward','↑','Avanzar'],['turnRight','↷','Girar a la derecha'],
        ['left','←','Mover a la izquierda'],['back','↓','Retroceder'],['right','→','Mover a la derecha'],
      ] as const).map(([action,label,name])=><button key={action} aria-label={name}
        onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);input.current.actions.add(action)}}
        onPointerUp={()=>input.current.actions.delete(action)} onPointerCancel={()=>input.current.actions.delete(action)} onLostPointerCapture={()=>input.current.actions.delete(action)}
        onKeyDown={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();input.current.actions.add(action)}}}
        onKeyUp={()=>input.current.actions.delete(action)} onBlur={()=>input.current.actions.delete(action)}
      >{label}</button>)}
    </nav>
  </>
}
