import { useEffect, useMemo } from 'react'
import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, MeshStandardMaterial, ShapeGeometry } from 'three'
import { CAMPUS_AREAS, CAMPUS_BUILDINGS, findCampusBuilding } from '../lib/campus'
import { createPavedShapes, createRoofGeometry, createTerrainShapes, createWalkwayGeometry } from '../lib/architecture'
import { campusBaseHeightAt, createGradedSurfaceGeometry } from '../lib/campusSlope'
import { COLISEO as h, COLISEO_ROAD_OUTLINES, COLISEO_GARDEN_STAIRS, COLISEO_PLATFORM, COLISEO_ANNEX_APRON, COLISEO_LOWER_FORECOURT, SPORTS_ANNEX, coliseoToCampus } from '../lib/coliseo'
import { PAGODA_POND } from '../lib/pagoda'
import { SPORT_ZONES, SPORT_STAIRS, stairOutline } from '../lib/terrain'
import type { CampusMaterials } from '../lib/materials'
import { pointInPolygon } from '../lib/geo'
import type { Vec2 } from '../types'

type Point = [number, number, number]
const noRaycast = () => null
const rectangle = (left: number, right: number, back: number, front: number): Vec2[] =>
  ([[left, back], [right, back], [right, front], [left, front]] as Vec2[]).map(coliseoToCampus)
function Block({ at, size, material }: { at: Point; size: Point; material: MeshStandardMaterial }) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size} /></mesh>
}

/** Orange sports hall and raised, ventilated green roof in the supplied photos. */
export function ColiseoBuilding({ materials, onSelect }: { materials: CampusMaterials; onSelect: () => void }) {
  const finish = useMemo(() => ({
    trim: new MeshStandardMaterial({ color: '#26483b', roughness: .7 }),
    shutter: new MeshStandardMaterial({ color: '#e5c98c', roughness: .85 }),
    glass: new MeshStandardMaterial({ color: '#7eaaa8', roughness: .26, metalness: .25 }),
    dark: new MeshStandardMaterial({ color: '#33453e', roughness: .8 }),
  }), [])
  const geometry = useMemo(() => {
    const ring = findCampusBuilding('coliseo')!.ring
    const base = Math.min(...ring.map(campusBaseHeightAt)) - .35
    const doorFloor = campusBaseHeightAt(coliseoToCampus([h.doorX, 1])) + .03
    const portal = rectangle(h.doorX - h.doorWidth / 2, h.doorX + h.doorWidth / 2, -.65, .4)
    const body = new ExtrudeGeometry(createTerrainShapes(ring, [portal]), { depth: h.eave - base, bevelEnabled: false })
    const roof = createRoofGeometry(ring, h.eave, 2.8)
    const upperRoof = createRoofGeometry(rectangle(-13.6, 13.6, -32.8, -9.3), h.eave + 3.7, 2.3)
    const uv = body.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4)
    return { body, roof, upperRoof, base, doorFloor }
  }, [])
  useEffect(() => () => {
    geometry.body.dispose(); geometry.roof.dispose(); geometry.upperRoof.dispose()
    Object.values(finish).forEach(m => m.dispose())
  }, [geometry, finish])
  const click = (event: { delta: number; stopPropagation: () => void }) => { if (event.delta <= 5) { event.stopPropagation(); onSelect() } }
  return <group>
    <mesh geometry={geometry.body} position={[0, geometry.base, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.coliseoOrange} castShadow receiveShadow onClick={click} />
    <mesh geometry={geometry.roof} material={materials.metalRoof} castShadow receiveShadow onClick={click} />
    <mesh geometry={geometry.upperRoof} material={materials.metalRoof} castShadow receiveShadow onClick={click} />
    <group position={[h.center[0], 0, -h.center[1]]} rotation={[0, h.angle, 0]}>
      <Block at={[h.doorX, (h.eave + geometry.doorFloor + 3.2) / 2, -.18]} size={[h.doorWidth, h.eave - geometry.doorFloor - 3.2, .9]} material={materials.coliseoOrange} />
      {/* Shallow blind arches and horizontal shutter/window bands. */}
      {Array.from({ length: 8 }, (_, i) => -h.width / 2 + (i + .5) * h.width / 8).map((x, i) => <group key={x}>
        <Block at={[x, h.eave - .42, .16]} size={[.38, .8, .4]} material={materials.coliseoOrange} />
        {Array.from({ length: 10 }, (_, j) => {
          const offset = (j / 9 - .5) * 4.45
          return <Block key={j} at={[x + offset, h.eave - .85 + .3 * (1 - (offset / 2.3) ** 2), .16]} size={[.5, .18, .32]} material={materials.coliseoOrange} />
        })}
        {Math.abs(x - h.doorX) > 3.1 && <>
          <Block at={[x, i < 3 ? 2.7 : 1.05, .11]} size={[3.65, i < 3 ? 1.45 : .75, .19]} material={finish.dark} />
          <Block at={[x, i < 3 ? 2.7 : 1.05, .23]} size={[3.35, i < 3 ? 1.22 : .55, .1]} material={i < 3 ? finish.shutter : finish.glass} />
          {Array.from({ length: i < 3 ? 8 : 4 }, (_, j) => <Block key={j} at={[x, (i < 3 ? 2.16 : .83) + j * (i < 3 ? .15 : .14), .3]} size={[3.35, .035, .055]} material={finish.shutter} />)}
          <Block at={[x, 1.95, .26]} size={[4.5, .15, .3]} material={finish.trim} />
        </>}
      </group>)}
      {[{ at: [0, 0, -h.depth] as Point, angle: Math.PI }, { at: [-h.width / 2, 0, -h.depth / 2] as Point, angle: -Math.PI / 2 }, { at: [h.width / 2, 0, -h.depth / 2] as Point, angle: Math.PI / 2 }].map(({ at, angle }, i) => <group key={i} position={at} rotation={[0, angle, 0]}>
        {[-14, -7, 0, 7, 14].map(x => <group key={x}>
          <Block at={[x, 2.3, .14]} size={[3.8, 1.1, .16]} material={finish.dark} />
          <Block at={[x, 2.3, .25]} size={[3.55, .88, .1]} material={finish.shutter} />
        </group>)}
      </group>)}
      <Block at={[0, h.eave, .18]} size={[h.width + .5, .26, .65]} material={finish.trim} />
      <Block at={[h.doorX, geometry.doorFloor + 1.5, -.5]} size={[h.doorWidth, 3, .12]} material={finish.glass} />
      {[-h.doorWidth / 2, 0, h.doorWidth / 2].map(x => <Block key={x} at={[h.doorX + x, geometry.doorFloor + 1.5, -.37]} size={[.09, 3, .1]} material={materials.cream} />)}
      <Block at={[h.doorX, geometry.doorFloor + 3.05, -.35]} size={[h.doorWidth + .2, .15, .22]} material={materials.cream} />
      {[-.17, .17].map(x => <Block key={x} at={[h.doorX + x, geometry.doorFloor + 1.2, -.22]} size={[.045, .65, .08]} material={materials.cream} />)}
      <Block at={[h.doorX, geometry.doorFloor, .45]} size={[h.doorWidth, .12, 1.6]} material={materials.entranceStone} />
      <Block at={[0, h.eave + 3.15, -21.05]} size={[26, 1.1, 22.2]} material={finish.dark} />
      {[-1, 1].flatMap(side => Array.from({ length: 10 }, (_, i) => <Block key={`${side}-${i}`} at={[-12.5 + i * 25 / 9, h.eave + 3.2, -21.05 + side * 11.15]} size={[.16, 1.15, .16]} material={materials.coliseoOrange} />))}
      <mesh position={[0, h.eave + 6.15, -21.05]} castShadow><coneGeometry args={[2.8, 2.5, 4]} /><primitive object={materials.metalRoof} attach="material" /></mesh>
      <mesh position={[0, h.eave + 7.65, -21.05]} castShadow><sphereGeometry args={[.28, 12, 8]} /><primitive object={materials.cream} attach="material" /></mesh>
    </group>
  </group>
}

/** Lower lane beside the Pagoda, with a higher lawn and a short retaining edge. */
export function ColiseoLandscape({ materials }: { materials: CampusMaterials }) {
  const geometry = useMemo(() => {
    const obstacles = [...CAMPUS_BUILDINGS.map(b => b.ring), ...CAMPUS_AREAS.filter(a => (a.kind === 'water' || a.kind === 'pitch') && !SPORT_ZONES.some(z => z.area.osmId === a.osmId)).map(a => a.ring), ...SPORT_ZONES.map(z => z.area.ring), ...SPORT_STAIRS.map(stairOutline), PAGODA_POND, COLISEO_GARDEN_STAIRS, COLISEO_ANNEX_APRON]
    const flat = new ShapeGeometry(createPavedShapes(COLISEO_ROAD_OUTLINES, [...obstacles,COLISEO_LOWER_FORECOURT])), road = createGradedSurfaceGeometry(flat)
    flat.dispose()
    const uv = road.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4)
    // Carry the lawn right up to the retaining edge, instead of leaving a
    // rounded terrain shoulder below the top of the wall.
    const lawns = createPavedShapes([COLISEO_PLATFORM], obstacles).map(shape => {
      const points = shape.extractPoints(1)
      const lawn = createRoofGeometry(points.shape.map(p => [p.x, p.y] as Vec2), 0, 0, points.holes.map(r => r.map(p => [p.x, p.y] as Vec2)))
      const positions = lawn.getAttribute('position')
      for (let i = 0; i < positions.count; i++) {
        positions.setY(i, h.platformLevel)
      }
      lawn.computeVertexNormals(); return lawn
    })
    const vertices: number[] = []
    const edges: Vec2[] = [[-24,h.platformFront],[h.southEdge,h.platformFront],[h.southEdge,23],[-24,23],[-24,h.platformFront]]
    for (let edge = 1; edge < edges.length; edge++) {
      const a = edges[edge-1], b = edges[edge], count = Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.5)
      for (let i = 0; i < count; i++) {
        const local = (t: number): Vec2 => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
        const mid = local((i+.5)/count)
        // The annex stands on the lawn, so the wall continues in front of it; only the steps break it.
        if (edge === 1 && Math.abs(mid[0]-h.stairX) < h.stairWidth/2+.1) continue
        // Where the lawn meets a sunken pitch, the pitch's own wall is the edge.
        if (SPORT_ZONES.some(z => pointInPolygon(coliseoToCampus(mid), z.area.ring))) continue
        const p = coliseoToCampus(local(i/count)), q = coliseoToCampus(local((i+1)/count))
        const low = edge === 1 ? campusBaseHeightAt(coliseoToCampus([mid[0],3.6]))-.2 : Math.min(campusBaseHeightAt(p),campusBaseHeightAt(q))-.35
        const v = [p[0],low,-p[1],q[0],low,-q[1],q[0],h.platformLevel,-q[1],p[0],low,-p[1],q[0],h.platformLevel,-q[1],p[0],h.platformLevel,-p[1]]
        vertices.push(...v)
        // Retaining faces remain visible from both the lane and garden.
        for (let t=0;t<v.length;t+=9) vertices.push(...v.slice(t+6,t+9),...v.slice(t+3,t+6),...v.slice(t,t+3))
      }
    }
    const wall = new BufferGeometry()
    wall.setAttribute('position', new Float32BufferAttribute(vertices, 3)); wall.computeVertexNormals()
    const curb = createWalkwayGeometry(Array.from({ length: 81 }, (_, i) => coliseoToCampus([-h.width / 2 + h.width * i / 80, 2.5])), .12, p => campusBaseHeightAt(p) + .085)
    const apron = createWalkwayGeometry(Array.from({length:33},(_,i)=>coliseoToCampus([SPORTS_ANNEX.left-.35+(SPORTS_ANNEX.right-SPORTS_ANNEX.left+.7)*i/32,(3.6+h.platformFront)/2])), h.platformFront-3.6,
      p => { const dx=p[0]-h.center[0],dy=p[1]-h.center[1],x=dx*Math.cos(h.angle)+dy*Math.sin(h.angle); return campusBaseHeightAt(coliseoToCampus([x,3.6]))+.025 })
    const forecourts = createPavedShapes([COLISEO_LOWER_FORECOURT],obstacles).map(shape=> {
      const p=shape.extractPoints(1), mesh=createRoofGeometry(p.shape.map(v=>[v.x,v.y] as Vec2),0,0,p.holes.map(r=>r.map(v=>[v.x,v.y] as Vec2)))
      const positions=mesh.getAttribute('position')
      for(let i=0;i<positions.count;i++) {
        const dx=positions.getX(i)-h.center[0],dy=-positions.getZ(i)-h.center[1],x=dx*Math.cos(h.angle)+dy*Math.sin(h.angle)
        positions.setY(i,campusBaseHeightAt(coliseoToCampus([x,3.6]))+.025)
      }
      mesh.computeVertexNormals();return mesh
    })
    return { road, wall, curb, lawns, apron, forecourts }
  }, [])
  useEffect(() => () => { geometry.forecourts.forEach(g=>g.dispose()); geometry.apron.dispose(); geometry.road.dispose(); geometry.wall.dispose(); geometry.curb.dispose(); geometry.lawns.forEach(g => g.dispose()) }, [geometry])
  return <group>
    <mesh geometry={geometry.road} position={[0, .57, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.coliseoLane} receiveShadow raycast={noRaycast} />
    {geometry.forecourts.map((g,i)=><mesh key={`forecourt-${i}`} geometry={g} material={materials.coliseoLane} receiveShadow raycast={noRaycast} />)}
    <mesh geometry={geometry.apron} material={materials.coliseoLane} receiveShadow raycast={noRaycast} />
    <mesh geometry={geometry.wall} material={materials.entranceStone} receiveShadow castShadow raycast={noRaycast} />
    {geometry.lawns.map((lawn, i) => <mesh key={i} geometry={lawn} material={materials.grass} receiveShadow raycast={noRaycast} />)}
    <mesh geometry={geometry.curb} receiveShadow raycast={noRaycast}><meshStandardMaterial color="#d4b54e" roughness={.9} /></mesh>
  </group>
}
