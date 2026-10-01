import raw from '../data/campus.json'
import { BUILDINGS } from '../data/buildings'
import type { BuildingInfo, Vec2 } from '../types'
import { centroid, toLocal } from './geo'

interface Feature {
  properties: Record<string, string | undefined>
  geometry: { type: string; coordinates: unknown }
}

export interface CampusBuilding {
  osmId: string
  ring: Vec2[]
  center: Vec2
  levels: number
  /** Present only for buildings listed in data/buildings.ts. */
  info?: BuildingInfo
}

const infoByOsmId = new Map(BUILDINGS.map((b) => [b.osmId, b]))
const features = (raw as unknown as { features: Feature[] }).features

export const CAMPUS_BUILDINGS: CampusBuilding[] = features
  .filter((f) => f.geometry.type === 'Polygon' && f.properties.building)
  .map((f) => {
    // Outer ring only: courtyards are ignored at this level of detail.
    const ring = (f.geometry.coordinates as number[][][])[0].map(toLocal)
    const osmId = f.properties.osm_id ?? ''
    return {
      osmId,
      ring,
      center: centroid(ring),
      levels: Number(f.properties['building:levels']) || 1,
      info: infoByOsmId.get(osmId),
    }
  })

export const CAMPUS_PATHS: Vec2[][] = features
  .filter((f) => f.geometry.type === 'LineString')
  .map((f) => (f.geometry.coordinates as number[][]).map(toLocal))

export function findCampusBuilding(buildingId: string): CampusBuilding | undefined {
  return CAMPUS_BUILDINGS.find((b) => b.info?.id === buildingId)
}
