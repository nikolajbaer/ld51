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

export const Vec3 = { x: Types.f32, y: Types.f32, z: Types.f32 }
export const Position = defineComponent(Vec3)
export const Rotation = defineComponent({y:Types.f32})
export const Velocity = defineComponent(Vec3)
export const Selected = defineComponent()
export const MovementTarget = defineComponent(Vec3)
export const AttackTarget = defineComponent({y:Types.eid})
export const CollisonRadius = defineComponent({r:Types.f32})

export const movementQuery = defineQuery([Position, Velocity, Rotation])
export const renderQuery = defineQuery([Position,Rotation])
export const selectedQuery = defineQuery([Selected])
export const colliderQuery = defineQuery([Position,CollisonRadius])
const movementTargetQuery = defineQuery([MovementTarget,Position,Velocity])


// TODO use planck to operate movement with collisions
export const movementSystem = (world) => {
  const { time: { delta } } = world
  const ents = movementQuery(world)
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]
    Position.x[eid] += Velocity.x[eid] * delta
    Position.y[eid] += Velocity.y[eid] * delta
    Position.z[eid] += Velocity.z[eid] * delta
    // Rotate in direction of movement
    if(Math.abs(Velocity.x[eid]) > 0 && Math.abs(Velocity.z[eid]) > 0){
      const dot = Velocity.z[eid]
      const det = Velocity.x[eid]
      Rotation.y[eid] = Math.atan2(det,dot)
    }
  }
  return world
}

const VELOCITY = 0.01
const MIN_DIST = 3

export const targetingSystem = (world) => {
  const ents = movementTargetQuery(world)
  for(let i =0; i< ents.length; i++){
    const eid = ents[i]
    const v = new Vector3(MovementTarget.x[eid] - Position.x[eid],0,MovementTarget.z[eid] - Position.z[eid])
    if(v.length < MIN_DIST){ 
      removeComponent(world,MovementTarget,eid)
      Velocity.x[eid] = 0
      Velocity.z[eid] = 0 
    }else{
      const v1 = v.normalize().multiplyScalar(VELOCITY)
      Velocity.x[eid] = v1.x
      Velocity.z[eid] = v1.z
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
  addComponent(world, Velocity, eid)
  addComponent(world, Rotation, eid)
  addComponent(world, CollisonRadius, eid)
  Position.x[eid] = x
  Position.z[eid] = z 
  Velocity.x[eid] = 0
  Velocity.z[eid] = 0
  Rotation.y[eid] = 0
  CollisonRadius.r[eid] = 1
  return eid
}

