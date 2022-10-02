import {
  createWorld,
  Types,
  defineComponent,
  defineQuery,
  addEntity,
  addComponent,
  pipe,
  removeComponent,
  removeEntity,
} from 'bitecs'

import { Vector3 } from 'three'
import * as pl from 'planck'

export const Vec3 = { x: Types.f32, y: Types.f32, z: Types.f32 }
export const Position = defineComponent(Vec3)
export const Rotation = defineComponent({y:Types.f32})
export const Selected = defineComponent()
export const MovementTarget = defineComponent(Vec3)
export const AttackTarget = defineComponent({y:Types.eid})
export const Fighter = defineComponent({d:Types.f32,rest:Types.f32,rate:Types.f32,team:Types.ui8})
export const Body = defineComponent({r:Types.f32,t:Types.ui8}) // mask and cat correspond to fixture filter/category in Planck
export const Hit = defineComponent({v:Types.eid})
export const Health = defineComponent({h:Types.f32})
export const Mob = defineComponent()
export const Gnome = defineComponent()
export const TriggerAnimation = defineComponent({a:Types.ui8})

export const movementQuery = defineQuery([Position,Rotation])
export const renderQuery = defineQuery([Position,Rotation])
export const selectedQuery = defineQuery([Selected])
export const bodyQuery = defineQuery([Position,Body])
const fighterQuery = defineQuery([Fighter])
const damageQuery = defineQuery([Hit,Health,Fighter])
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
      body.eid = eid
      const fixture = pl.Circle(Body.r[eid])
      body.createFixture(fixture)
      plBodyMap.set(eid,body)
    }

    const pos = body.getPosition()
    Position.x[eid] = pos.x
    Position.z[eid] = pos.y 
    // handle rotation based on where unit is going
    //Rotation.y[eid] = body.getAngle()

    // Rotate in direction of movement
    const vel = body.getLinearVelocity()
    if(Math.abs(vel.x) > 0 && Math.abs(vel.y) > 0){
      const dot = vel.y
      const det = vel.x
      Rotation.y[eid] = Math.atan2(det,dot)
    }
  }
  plWorld.step(1/60,10,8)
  plWorld.clearForces()

  for (let c = plWorld.getContactList(); c; c = c.getNext()) {
    const eid_a = c.getFixtureA().eid
    const eid_b = c.getFixtureB().eid
    // if we are contacting enemies
    // last contact "wins"
    if(Fighter.team[eid_a] != Fighter.team[eid_b]){
      addComponent(world, Hit, eid_a)
      Hit.v[eid] = eid_b
      addComponent(world, Hit, eid_b)
      Hit.v[eid] = eid_a
    }
  }
  return world
}

export const damageSystem = (world) => {
  const { time: { delta } } = world
  const ents = damageQuery(world)
  for(let i=0;i<ents.length;i++){
    const eid = ents[i]
    if(Fighter.rest[eid] <= 0){
      const eid_victim = Hit.v[eid]
      removeComponent(world, Hit, eid)
      // Apply Damage
      Health[eid_victim] -= Fighter.d[eid]
      if(Health[eid_victim] <= 0){
        // Death
        addComponent(world,TriggerAnimation,eid_victim) 
        TriggerAnimation.a[eid_victim] = 2 // die
      }else{
        addComponent(world,TriggerAnimation,eid_victim) 
        TriggerAnimation.a[eid_victim] = 1 // hit
      }
      addComponent(world,TriggerAnimation,eid_victim) 
      TriggerAnimation.a[eid_victim] = 0 // attack
      // reset rate of attack counter
      Fighter.rest[eid] = Fighter.rate[eid]
    }
  }
  // adjust rest for rate of fire for this world delta
  const f_ents = fighterQuery(world)
  for(let i=0;i<f_ents.length; i++){
    Fighter.rest[f_ents[i]] -= delta
    if(Fighter.rest[f_ents[i]] <= 0){
      Fighter.rest[f_ents[i]] = 0 
    }
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
  addComponent(world, Health, eid)
  addComponent(world, Gnome, eid)
  addComponent(world, Fighter, eid)
  Position.x[eid] = x
  Position.z[eid] = z 
  Rotation.y[eid] = 0
  Body.r[eid] = 2
  Body.t[eid] = 2
  Health.h = 100
  Fighter.d[eid] = 20
  Fighter.rate[eid] = 2000  // hit every 1 sec
  Fighter.rest[eid] = 0  // ready to hit if 0
  Fighter.team[eid] = 0 // gnome or mob
  return eid
}

export const spawnMob = (x,z,world) => {
  const eid = addEntity(world)
  addComponent(world, Position, eid)
  addComponent(world, Rotation, eid)
  addComponent(world, Body, eid)
  addComponent(world, Health, eid)
  addComponent(world, Mob, eid)
  addComponent(world, MovementTarget, eid)
  addComponent(world, Fighter, eid)
  Position.x[eid] = x
  Position.z[eid] = z 
  Rotation.y[eid] = 0
  Body.r[eid] = 2
  Body.t[eid] = 2
  Health.h = 100
  MovementTarget.x[eid] = 0
  MovementTarget.y[eid] = 0
  MovementTarget.z[eid] = 0
  Fighter.d[eid] = 20
  Fighter.rate[eid] = 2000  // hit every 1 sec
  Fighter.rest[eid] = 0  // ready to hit if 0
  Fighter.team[eid] = 1 // gnome or mob
  return eid
}