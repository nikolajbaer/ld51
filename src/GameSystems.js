import {
  createWorld,
  Types,
  defineComponent,
  defineQuery,
  addEntity,
  addComponent,
  pipe,
  removeComponent,
} from 'bitecs'

import { Vector3 } from 'three'
import * as pl from 'planck'

export const Vec3 = { x: Types.f32, y: Types.f32, z: Types.f32 }
export const Position = defineComponent(Vec3)
export const Rotation = defineComponent({y:Types.f32})
export const Selected = defineComponent()
export const MovementTarget = defineComponent(Vec3)
export const AttackTarget = defineComponent({y:Types.eid})
export const Body = defineComponent({r:Types.f32,t:Types.ui8})

export const movementQuery = defineQuery([Position,Rotation])
export const renderQuery = defineQuery([Position,Rotation])
export const selectedQuery = defineQuery([Selected])
export const bodyQuery = defineQuery([Position,Body])
const movementTargetQuery = defineQuery([MovementTarget,Position,Body])

// TODO use planck to operate movement with collisions
const plWorld = pl.World({})
const Vec2 = pl.Vec2
const plBodyMap = new Map()
const PL_BODY_TYPES = ['kinematic','static','dynamic']

export const movementSystem = (world) => {
  const { time: { delta } } = world
  const ents = bodyQuery(world)
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]
    let body = plBodyMap.get(eid)
    if(body==undefined){
      body = plWorld.createBody({type:PL_BODY_TYPES[Body.t[eid]],position:Vec2(Position.x[eid],Position.z[eid]),angle:Rotation.y[eid]})
      body.createFixture(pl.Circle(Body.r[eid]))
      plBodyMap.set(eid,body)
    }

    const pos = body.getPosition()
    Position.x[eid] = pos.x
    Position.z[eid] = pos.y 
    Rotation.y[eid] = body.getAngle()

    // Rotate in direction of movement
/*
    if(Math.abs(Velocity.x[eid]) > 0 && Math.abs(Velocity.z[eid]) > 0){
      const dot = Velocity.z[eid]
      const det = Velocity.x[eid]
      Rotation.y[eid] = Math.atan2(det,dot)
    }
*/
  }
  plWorld.step(1/60,10,8)
  plWorld.clearForces()

  for (let c = plWorld.getContactList(); c; c = c.getNext()) {
    // What kind of contacts do we want to monitor?
  }

  return world
}

const VELOCITY = 5
const MIN_DIST = 3

export const targetingSystem = (world) => {
  const ents = movementTargetQuery(world)
  for(let i =0; i< ents.length; i++){
    const eid = ents[i]
    const v = new Vector3(MovementTarget.x[eid] - Position.x[eid],0,MovementTarget.z[eid] - Position.z[eid])
    if(v.length < MIN_DIST){ 
      removeComponent(world,MovementTarget,eid)
      const body = plBodyMap.get(eid)
      if(body){
        body.setLinearVelocity(Vec2(0,0))
      }
    }else{
      const v1 = v.normalize().multiplyScalar(VELOCITY)
      const body = plBodyMap.get(eid)
      if(body){
        // TODO
        body.setLinearVelocity(Vec2(v1.x,v1.z))
        //body.setAngle(0)
      }
      // TODO aim at angle
      //Velocity.x[eid] = v1.x
      //Velocity.z[eid] = v1.z
    }
  }
  return world
}

export const timeSystem = world => {
  const { time } = world
  const now = performance.now()
  const delta = now - time.then
  time.delta = delta
  time.elapsed += delta
  time.then = now
  return world
}

export const spawnGnome = (x,z,world) => {
  const eid = addEntity(world)
  addComponent(world, Position, eid)
  addComponent(world, Rotation, eid)
  addComponent(world, Body, eid)
  Position.x[eid] = x
  Position.z[eid] = z 
  Rotation.y[eid] = 0
  Body.r[eid] = 1
  Body.t[eid] = 2
  return eid
}

