import { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CanvasTexture, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Group,
  MeshStandardMaterial, SphereGeometry, SRGBColorSpace, SpriteMaterial, TubeGeometry, Vector3,
} from 'three'
import { AnimalHearts } from './AnimalHearts'
import { nearestPettableAnimal } from '../lib/animalAffection'
import { ANIMAL_ROUTES, advanceAnimalTime, sampleAnimalPosition, type CampusAnimalId } from '../lib/campusAnimals'

type Point = [number, number, number]
const noRaycast = () => null

function useAnimalParts() {
  const parts = useMemo(() => ({
    sphere: new SphereGeometry(1, 14, 10),
    cylinder: new CylinderGeometry(1, 1, 1, 8),
    ear: new ConeGeometry(1, 1, 3),
    pink: new MeshStandardMaterial({ color: '#edacb7', roughness: .87 }),
    snout: new MeshStandardMaterial({ color: '#df8c9d', roughness: .85 }),
    hoof: new MeshStandardMaterial({ color: '#493337', roughness: .95 }),
    black: new MeshStandardMaterial({ color: '#161a20', roughness: .78 }),
    highlight: new MeshStandardMaterial({ color: '#2a3037', roughness: .82 }),
    eye: new MeshStandardMaterial({ color: '#070b10', roughness: .25 }),
    pancho: new MeshStandardMaterial({ color: '#28baa9', roughness: .55 }),
    pancha: new MeshStandardMaterial({ color: '#f09879', roughness: .55 }),
  }), [])
  useEffect(() => () => Object.values(parts).forEach(part => part.dispose()), [parts])
  return parts
}
type Parts = ReturnType<typeof useAnimalParts>

function Round({ at, size, material, parts, rotation }: { at: Point; size: Point; material: MeshStandardMaterial; parts: Parts; rotation?: Point }) {
  return <mesh geometry={parts.sphere} material={material} position={at} scale={size} rotation={rotation} castShadow={false} raycast={noRaycast} />
}

function Leg({ at, index, pig, parts, legs }: { at: Point; index: number; pig: boolean; parts: Parts; legs: React.RefObject<(Group | null)[]> }) {
  const upper = pig ? .20 : .38, lower = pig ? .19 : .46, radius = pig ? .09 : .041
  const skin = pig ? parts.pink : parts.black
  return <group position={at} ref={group => { legs.current[index] = group }}>
    <mesh position={[0, -upper / 2, 0]} scale={[radius, upper, radius]} geometry={parts.cylinder} material={skin} castShadow={false} raycast={noRaycast} />
    <group position={[0, -upper, 0]}>
      <Round at={[0, 0, 0]} size={[radius * 1.2, radius * 1.2, radius * 1.2]} material={skin} parts={parts} />
      <mesh position={[0, -lower / 2, 0]} scale={[radius * .7, lower, radius * .7]} geometry={parts.cylinder} material={skin} castShadow={false} raycast={noRaycast} />
      <Round at={[.035, -lower + .02, 0]} size={pig ? [.11, .07, .085] : [.10, .047, .052]} material={pig ? parts.hoof : parts.black} parts={parts} />
    </group>
  </group>
}

function NameTag({ id, height }: { id: CampusAnimalId; height: number }) {
  const material = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 320; canvas.height = 96
    const context = canvas.getContext('2d')!
    context.fillStyle = 'rgba(17, 27, 25, .85)'
    context.beginPath(); context.roundRect(10, 10, 300, 76, 28); context.fill()
    context.fillStyle = '#ffffff'; context.textAlign = 'center'; context.textBaseline = 'middle'
    context.font = '600 48px system-ui, sans-serif'
    context.fillText(ANIMAL_ROUTES[id].name, 160, 50)
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace
    return new SpriteMaterial({ map, transparent: true, depthWrite: false })
  }, [id])
  useEffect(() => () => { material.map?.dispose(); material.dispose() }, [material])
  // World-sized billboard: readable nearby, naturally small in the campus overview.
  return <sprite material={material} position={[0, height, 0]} scale={[2.1, .63, 1]} raycast={noRaycast} />
}

function Animal({ id, seconds, parts, root, walking, burst, onPet }: { id: CampusAnimalId; seconds: React.RefObject<number>; parts: Parts; root:React.RefObject<Group|null>; walking:boolean; burst:number; onPet:(id:CampusAnimalId)=>void }) {
  const body = useRef<Group>(null), tail = useRef<Group>(null)
  const legs = useRef<(Group | null)[]>([])
  const pig = id === 'gaston'
  const walkingSeconds = useRef(0), lastTick = useRef(seconds.current)
  const tailGeometry = useMemo(() => {
    const points = pig
      ? Array.from({ length: 25 }, (_, i) => new Vector3(-.77 - i / 24 * .29, .78 + Math.cos(i / 24 * Math.PI * 4) * .085, Math.sin(i / 24 * Math.PI * 4) * .085))
      : [new Vector3(-.76, 1.15, 0), new Vector3(-1, .98, .03), new Vector3(-1.21, .63, .13), new Vector3(-1.43, .43, .18)]
    return new TubeGeometry(new CatmullRomCurve3(points), pig ? 32 : 16, pig ? .027 : .024, 5, false)
  }, [pig])
  useEffect(() => () => tailGeometry.dispose(), [tailGeometry])
  const initial = sampleAnimalPosition(id, 0)
  useFrame(({ camera }) => {
    if (!root.current) return
    const delta = seconds.current - lastTick.current
    lastTick.current = seconds.current
    // Wait within petting reach so a finger can reliably tap the animal.
    const waiting=nearestPettableAnimal(walking,camera.position,[{id,position:root.current.position}])===id
    if(!waiting)walkingSeconds.current = advanceAnimalTime(id, walkingSeconds.current, delta)
    const sample = sampleAnimalPosition(id, walkingSeconds.current)
    root.current.position.set(sample.point[0], sample.height + .04, -sample.point[1])
    // Smooth turns while the position itself always stays on the checked route.
    const turn = Math.atan2(Math.sin(sample.yaw - root.current.rotation.y), Math.cos(sample.yaw - root.current.rotation.y))
    root.current.rotation.y += turn * .23
    const gait = sample.distance * (pig ? 7 : 6)
    if (body.current) body.current.position.y = Math.sin(gait * 2) * (pig ? .014 : .019)
    legs.current.forEach((leg, i) => {
      if (!leg) return
      const phase = gait + ([0, Math.PI, Math.PI, 0][i])
      leg.rotation.z = Math.sin(phase) * (pig ? .26 : .34)
      leg.children[1].rotation.z = Math.max(0, Math.cos(phase)) * (pig ? .20 : .33)
    })
    if (tail.current) tail.current.rotation.y = Math.sin(gait * .35) * (pig ? .11 : .18)
    const label = root.current.children.find(child => child.type === 'Sprite')
    if (label) label.visible = camera.position.distanceTo(root.current.position) < 100
  })

  return <group ref={root} name={`campus-animal-${id}`} position={[initial.point[0], initial.height + .04, -initial.point[1]]} rotation={[0, initial.yaw, 0]}>
    <group ref={body}>
      {pig ? <>
        <Round at={[0, .68, 0]} size={[.75, .43, .38]} material={parts.pink} parts={parts} />
        <Round at={[.64, .73, 0]} size={[.36, .32, .31]} material={parts.pink} parts={parts} />
        <Round at={[.94, .67, 0]} size={[.20, .19, .24]} material={parts.snout} parts={parts} />
        {[-1, 1].map(side => <group key={side}>
          <Round at={[1.12, .69, side * .09]} size={[.027, .048, .037]} material={parts.hoof} parts={parts} />
          <Round at={[.76, .87, side * .266]} size={[.039, .039, .023]} material={parts.eye} parts={parts} />
          <mesh position={[.61, 1.04, side * .23]} rotation={[side * .35, 0, -.25]} scale={[.16, .30, .13]} geometry={parts.ear} material={parts.snout} castShadow={false} raycast={noRaycast} />
        </group>)}
      </> : <>
        {/* Deep chest, high tucked belly, fine muzzle and long legs: greyhound silhouette. */}
        <Round at={[.28, 1.1, 0]} size={[.36, .36, .20]} material={parts.black} parts={parts} />
        <Round at={[-.22, 1.15, 0]} size={[.53, .19, .155]} material={parts.black} parts={parts} />
        <Round at={[-.57, 1.05, 0]} size={[.25, .26, .185]} material={parts.highlight} parts={parts} />
        <Round at={[.61, 1.30, 0]} size={[.13, .37, .125]} rotation={[0, 0, -.42]} material={parts.black} parts={parts} />
        <Round at={[.86, 1.59, 0]} size={[.27, .14, .12]} material={parts.black} parts={parts} />
        <Round at={[1.08, 1.56, 0]} size={[.20, .085, .085]} material={parts.highlight} parts={parts} />
        <Round at={[1.255, 1.56, 0]} size={[.054, .065, .066]} material={parts.eye} parts={parts} />
        <Round at={[.76, 1.47, 0]} size={[.14, .075, .143]} rotation={[0, 0, -.42]} material={parts[id]} parts={parts} />
        {[-1, 1].map(side => <group key={side}>
          <Round at={[.88, 1.64, side * .11]} size={[.028, .028, .016]} material={parts.eye} parts={parts} />
          <Round at={[.66, 1.61, side * .10]} size={[.13, .059, .035]} rotation={[0, side * .3, -.3]} material={parts.highlight} parts={parts} />
        </group>)}
      </>}
      <group ref={tail}><mesh geometry={tailGeometry} material={pig ? parts.pink : parts.black} castShadow={false} raycast={noRaycast} /></group>
      {(pig ? [[.44, .43, -.25], [.44, .43, .25], [-.44, .43, -.25], [-.44, .43, .25]] : [[.35, .88, -.14], [.35, .88, .14], [-.56, .88, -.14], [-.56, .88, .14]]).map((at, index) => <Leg key={index} at={at as Point} index={index} pig={pig} parts={parts} legs={legs} />)}
    </group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.01,0]} raycast={noRaycast}><circleGeometry args={[.6,24]}/><meshBasicMaterial color="#18241e" transparent opacity={.2} depthWrite={false}/></mesh>
    <NameTag id={id} height={pig ? 1.57 : 2.12} />
    <AnimalHearts burst={walking ? burst : 0} height={pig ? 1.4 : 1.95}/>
    {walking && <mesh position={[0,pig?.7:.95,0]} scale={[1.45,pig?.65:1,.6]} onClick={event=>{event.stopPropagation();if(event.delta<8)onPet(id)}}>
      <sphereGeometry args={[1,12,8]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/>
    </mesh>}
  </group>
}

/** Mounted outside the static geometry batch; animate at 30 fps only while visible. */
export function CampusAnimals({walking,onNearbyAnimalChange}:{walking:boolean;onNearbyAnimalChange:(id:CampusAnimalId|null)=>void}) {
  const invalidate = useThree(state => state.invalidate)
  const camera=useThree(state=>state.camera),gl=useThree(state=>state.gl)
  const roots=useMemo(()=>({gaston:createRef<Group>(),pancho:createRef<Group>(),pancha:createRef<Group>()}),[])
  const ids=Object.keys(ANIMAL_ROUTES) as CampusAnimalId[]
  const [bursts,setBursts]=useState<Record<CampusAnimalId,number>>({gaston:0,pancho:0,pancha:0})
  const lastPet=useRef<Record<CampusAnimalId,number>>({gaston:-Infinity,pancho:-Infinity,pancha:-Infinity})
  const nearby=useRef<CampusAnimalId|null>(null)
  const findNearby=useCallback(()=>nearestPettableAnimal(walking,camera.position,
    (Object.keys(roots) as CampusAnimalId[]).flatMap(id=>roots[id].current?[{id,position:roots[id].current!.position}]:[])),[walking,camera,roots])
  const pet=useCallback((id:CampusAnimalId)=>{
    if(!walking||document.hidden||document.querySelector('dialog[open]'))return
    // Touch targets the animal tapped, even when both greyhounds are within reach.
    const animal=roots[id].current
    if(!animal||nearestPettableAnimal(true,camera.position,[{id,position:animal.position}])!==id)return
    const now=performance.now()
    if(now-lastPet.current[id]<700)return
    lastPet.current[id]=now;setBursts(value=>({...value,[id]:now}));invalidate()
    if(import.meta.env.DEV){gl.domElement.dataset.petAnimal=id;gl.domElement.dataset.petCount=String(Number(gl.domElement.dataset.petCount??0)+1)}
  },[walking,camera,roots,invalidate,gl])
  useEffect(()=>{
    if(!walking){nearby.current=null;onNearbyAnimalChange(null);return}
    const key=(event:KeyboardEvent)=>{
      if(event.code!=='KeyE'||event.repeat||(event.target as HTMLElement)?.closest('input,select,textarea,button,[contenteditable="true"]'))return
      const id=findNearby();if(id){event.preventDefault();pet(id)}
    }
    window.addEventListener('keydown',key)
    return ()=>window.removeEventListener('keydown',key)
  },[walking,findNearby,pet,onNearbyAnimalChange])
  useFrame(()=>{
    const id=walking&&!document.hidden&&!document.querySelector('dialog[open]')?findNearby():null
    if(id!==nearby.current){nearby.current=id;onNearbyAnimalChange(id)}
  })
  const seconds = useRef(0)
  const parts = useAnimalParts()
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    let last = performance.now()
    const updateVisibility = () => {
      if (timer !== undefined) clearInterval(timer)
      timer = undefined
      last = performance.now()
      if (document.visibilityState === 'hidden') return
      timer = setInterval(() => {
        const now = performance.now()
        seconds.current += Math.min((now - last) / 1000, .1)
        last = now
        invalidate()
      }, 1000 / 30)
      invalidate()
    }
    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      if (timer !== undefined) clearInterval(timer)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [invalidate])
  return <group name="campus-animals">
    {ids.map(id=><Animal key={id} id={id} seconds={seconds} parts={parts} root={roots[id]} walking={walking} burst={bursts[id]} onPet={pet}/>)}
  </group>
}
