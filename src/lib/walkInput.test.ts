import { describe, expect, it } from 'vitest'
import { joystickMovement } from './walkInput'

describe('walking joystick',()=>{
  it('has a neutral dead zone so a resting finger does not drift',()=>{
    expect(joystickMovement(2,-1,30)).toEqual([0,0])
  })
  it('maps upward drag to forward travel and preserves analog speed',()=>{
    expect(joystickMovement(0,-15,30)).toEqual([0,.5])
    expect(joystickMovement(-15,0,30)).toEqual([-.5,0])
  })
  it('clamps diagonal and out-of-bounds input to normal walking speed',()=>{
    const [side,forward]=joystickMovement(90,-90,30)
    expect(side).toBeGreaterThan(0)
    expect(forward).toBeGreaterThan(0)
    expect(Math.hypot(side,forward)).toBeCloseTo(1)
  })
})
