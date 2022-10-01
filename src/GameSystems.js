import {
  createWorld,
  Types,
  defineComponent,
  defineQuery,
  addEntity,
  addComponent,
  pipe,
} from 'bitecs'

export const Vector3 = { x: Types.f32, y: Types.f32, z: Types.f32 }
export const Position = defineComponent(Vector3)
export const Velocity = defineComponent(Vector3)

export const movementQuery = defineQuery([Position, Velocity])

export const movementSystem = (world) => {
  const { time: { delta } } = world
  const ents = movementQuery(world)
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]
    Position.x[eid] += Velocity.x[eid] * delta
    Position.y[eid] += Velocity.y[eid] * delta
    Position.z[eid] += Velocity.z[eid] * delta
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
  Position.x[eid] = x
  Position.z[eid] = z 
  Velocity.x[eid] = Math.random()/1000
  Velocity.z[eid] = Math.random()/1000
  return eid
}

