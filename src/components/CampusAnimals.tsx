import { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CanvasTexture, Group, SRGBColorSpace, SpriteMaterial,
} from 'three'
import { AnimalModel, type AnimalModelHandle } from './AnimalModel'
import { AnimalHearts } from './AnimalHearts'
import { nearestPettableAnimal } from '../lib/animalAffection'
import { ANIMAL_ROUTES, advanceAnimalTime, sampleAnimalPosition, type CampusAnimalId } from '../lib/campusAnimals'

const noRaycast = () => null

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

function Animal({ id, seconds, root, walking, burst, onPet }: { id: CampusAnimalId; seconds: React.RefObject<number>; root:React.RefObject<Group|null>; walking:boolean; burst:number; onPet:(id:CampusAnimalId)=>void }) {
  const body = useRef<Group>(null), model = useRef<AnimalModelHandle>(null)
  const pig = id === 'gaston'
  const walkingSeconds = useRef(0), lastTick = useRef(seconds.current)
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
    model.current?.pose(sample.distance)
    const label = root.current.children.find(child => child.type === 'Sprite')
    if (label) label.visible = camera.position.distanceTo(root.current.position) < 100
  })

  return <group ref={root} name={`campus-animal-${id}`} position={[initial.point[0], initial.height + .04, -initial.point[1]]} rotation={[0, initial.yaw, 0]}>
    <group ref={body}><AnimalModel ref={model} id={id} /></group>
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
    {ids.map(id=><Animal key={id} id={id} seconds={seconds} root={roots[id]} walking={walking} burst={bursts[id]} onPet={pet}/>)}
  </group>
}
