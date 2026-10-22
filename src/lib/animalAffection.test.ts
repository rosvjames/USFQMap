import { describe, expect, it } from 'vitest'
import { nearestPettableAnimal } from './animalAffection'
import { hallToCampus } from './hall'
import { miguelToCampus } from './miguel'
import type { CampusAnimalId } from './campusAnimals'
const p=([x,y]:[number,number],height=2.2)=>({x,y:height,z:-y})
const player=p(hallToCampus([0,12]))
const animals=[{id:'gaston' as CampusAnimalId,position:p(hallToCampus([1,12]),.6)}]

describe('first-person animal affection',()=>{
  it('cannot activate in the overview even next to an animal',()=>{
    expect(nearestPettableAnimal(false,player,animals)).toBe(null)
  })
  it('selects the closest animal within reach',()=>{
    expect(nearestPettableAnimal(true,player,[...animals,{id:'pancho',position:p(hallToCampus([2.5,12]),.6)}])).toBe('gaston')
  })
  it('does not reach distant animals or an animal on another level',()=>{
    expect(nearestPettableAnimal(true,player,[{id:'gaston',position:p(hallToCampus([8,12]))}])).toBe(null)
    expect(nearestPettableAnimal(true,player,[{id:'gaston',position:p(hallToCampus([0,12]),8)}])).toBe(null)
  })
  it('does not pet through the drinking wall at Miguel',()=>{
    expect(nearestPettableAnimal(true,p(miguelToCampus([-16.3,10.6])),[{id:'pancho',position:p(miguelToCampus([-16.3,12.6]),.6)}])).toBe(null)
  })
})
