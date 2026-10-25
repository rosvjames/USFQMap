import { CAMPUS_AREAS, CAMPUS_BOUNDARY, CAMPUS_BUILDINGS, CAMPUS_PATHS, CAMPUS_STREET_CUTOUTS, findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { sportFenceSegments, bridgeHeightAt, segmentProjection, SPORT_SEATING, SPORT_ZONES, terrainHeightAt, wallStepsOutline } from './terrain'
import { hallToCampus } from './hall'
import { HALL_TUNNEL_CUTOUT } from './hallPassage'
import { CAMPUS_GATE_CUTOUT, MIGUEL_DRINKING_WALL, miguelToCampus, MIGUEL_FORECOURT_RAILS, MIGUEL_RAIL_Z } from './miguel'
import { hayekLandingHeightAt } from './hayek'
import { PAGODA_POND, pagodaEntranceHeightAt } from './pagoda'
import { GALILEO_LAGOON } from './galileo'
import { HALL_MINI_WORLD_OUTLINE } from './hallMiniPlaza'
import { MIGUEL_ROCKET_BASE, MIGUEL_GARDEN_BIN, MIGUEL_GARDEN_TABLES, miguelGardenToCampus } from './miguelGarden'
import type { Vec2 } from '../types'

const RADIUS=.3
const water=[...CAMPUS_AREAS.filter(a=>a.kind==='water').map(a=>a.ring),GALILEO_LAGOON.ring]
function rectangle(x:number,z:number,width:number,depth:number,transform:(p:Vec2)=>Vec2):Vec2[] {
  return ([[x-width/2,z-depth/2],[x+width/2,z-depth/2],[x+width/2,z+depth/2],[x-width/2,z+depth/2]] as Vec2[]).map(transform)
}
const wall=MIGUEL_DRINKING_WALL,bin=MIGUEL_GARDEN_BIN
const solids=[MIGUEL_ROCKET_BASE,HALL_MINI_WORLD_OUTLINE,
  rectangle(0,3.95,2.1,1.7,hallToCampus),
  ...[-1,1].flatMap(side=>[
    rectangle(side*3.65,2.8,1.04,1.04,hallToCampus),
    rectangle(side*7.75,1.7,1.3,3.4,hallToCampus),
    rectangle(side*8.65,5.5,1.36,1.75,hallToCampus),
  ]),
  rectangle(wall.x,wall.z,wall.width,wall.depth,miguelToCampus),
  rectangle(...bin.at,bin.width+.2,bin.depth+.3,miguelGardenToCampus),
  ...MIGUEL_GARDEN_TABLES.map(([x,z])=>rectangle(x,z,3.4,3.4,miguelGardenToCampus)),
  ...SPORT_SEATING.map(wallStepsOutline),
].map(ring=>({ring,minX:Math.min(...ring.map(p=>p[0])),maxX:Math.max(...ring.map(p=>p[0])),minY:Math.min(...ring.map(p=>p[1])),maxY:Math.max(...ring.map(p=>p[1]))}))
const buildings=CAMPUS_BUILDINGS.map(b=>({...b,minX:Math.min(...b.ring.map(p=>p[0])),maxX:Math.max(...b.ring.map(p=>p[0])),minY:Math.min(...b.ring.map(p=>p[1])),maxY:Math.max(...b.ring.map(p=>p[1]))}))
const fences:[Vec2,Vec2][]=[
  ...SPORT_ZONES.flatMap(sportFenceSegments),
  ...MIGUEL_FORECOURT_RAILS.map(([a,b]):[Vec2,Vec2]=>[miguelToCampus([a,MIGUEL_RAIL_Z]),miguelToCampus([b,MIGUEL_RAIL_Z])]),
]
const clearance:Vec2[]=[[0,0],[RADIUS,0],[-RADIUS,0],[0,RADIUS],[0,-RADIUS]]
const insideBounds=(point:Vec2,b:{minX:number;maxX:number;minY:number;maxY:number})=>point[0]>=b.minX&&point[0]<=b.maxX&&point[1]>=b.minY&&point[1]<=b.maxY

/** Exterior model: solid footprints, water and display furniture; stairs follow the rendered grade. */
export function isWalkable(point:Vec2):boolean {
  if(!point.every(Number.isFinite)||fences.some(([a,b])=>segmentProjection(point,a,b).distance<RADIUS))return false
  return clearance.every(([dx,dy])=>{
    const p:Vec2=[point[0]+dx,point[1]+dy]
    const bridge=bridgeHeightAt(p)
    if(!pointInPolygon(p,CAMPUS_BOUNDARY)&&bridge===undefined&&hayekLandingHeightAt(p)===undefined&&!CAMPUS_STREET_CUTOUTS.some(r=>pointInPolygon(p,r)))return false
    if(solids.some(b=>insideBounds(p,b)&&pointInPolygon(p,b.ring)))return false
    if(buildings.some(b=>insideBounds(p,b)&&pointInPolygon(p,b.ring)&&
      !(b.info?.id==='einstein'&&pointInPolygon(p,HALL_TUNNEL_CUTOUT))&&
      !(b.info?.id==='guardiania-norte'&&pointInPolygon(p,CAMPUS_GATE_CUTOUT))))return false
    if(water.some(ring=>pointInPolygon(p,ring)))return false
    if(pointInPolygon(p,PAGODA_POND)&&pagodaEntranceHeightAt(p)===undefined)return false
    return true
  })
}

const spawnPoints=CAMPUS_PATHS.flatMap(line=>line.flatMap((b,i)=>{
  if(!i)return [b]
  const a=line[i-1],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4))
  return Array.from({length:n},(_,j):Vec2=>[a[0]+(b[0]-a[0])*(j+1)/n,a[1]+(b[1]-a[1])*(j+1)/n])
}))
export function walkingStart(buildingId='hall-principal'):Vec2 {
  const fallback=hallToCampus([0,12])
  if(buildingId==='hall-principal'&&isWalkable(fallback))return fallback
  const miguelForecourt=miguelToCampus([-4.5,12.4])
  if(buildingId==='miguel-de-santiago'&&isWalkable(miguelForecourt))return miguelForecourt
  const target=findCampusBuilding(buildingId)?.center??fallback
  const candidates=spawnPoints.filter(p=>Math.hypot(p[0]-target[0],p[1]-target[1])>=8)
  candidates.sort((a,b)=>Math.hypot(a[0]-target[0],a[1]-target[1])-Math.hypot(b[0]-target[0],b[1]-target[1]))
  return [...(candidates.find(isWalkable)??fallback)]
}

/** Substeps prevent tunnelling; a step-height check prevents falling off decks and retaining walls. */
export function moveWalker(start:Vec2,movement:Vec2):Vec2 {
  return moveWalkerOnSurface(start, movement).point
}

export function moveWalkerOnSurface(start: Vec2, movement: Vec2, height = terrainHeightAt(start)): { point: Vec2; height: number } {
  if(!movement.every(Number.isFinite))return { point: [...start], height }
  let point:Vec2=[...start]
  const steps=Math.max(1,Math.ceil(Math.hypot(...movement)/.15))
  const dx=movement[0]/steps,dy=movement[1]/steps
  for(let i=0;i<steps;i++) {
    const next:Vec2=[point[0]+dx,point[1]+dy]
    const nextHeight = terrainHeightAt(next, height)
    if(!isWalkable(next)||Math.abs(nextHeight-height)>.38)break
    point=next
    height=nextHeight
  }
  return { point, height }
}
