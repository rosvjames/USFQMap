import type { CampusAnimalId } from './campusAnimals'
import { isAnimalTravelClear } from './animalObstacles'
interface Position {x:number;y:number;z:number}
export interface PettableAnimal { id:CampusAnimalId;position:Position }
/** Reach is short, checked at the current world positions, and cannot cross a wall or another floor. */
export function nearestPettableAnimal(walking:boolean,player:Position,animals:PettableAnimal[]):CampusAnimalId|null {
  if(!walking)return null
  let nearest:CampusAnimalId|null=null,distance=3.6
  for(const animal of animals) {
    const p=animal.position,d=Math.hypot(p.x-player.x,p.z-player.z)
    if(d<distance&&Math.abs(p.y+.9-player.y)<2&&isAnimalTravelClear([player.x,-player.z],[p.x,-p.z],0)) {
      nearest=animal.id;distance=d
    }
  }
  return nearest
}
