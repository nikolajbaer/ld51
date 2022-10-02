import {
  createWorld,
  Types,
  defineComponent,
  defineQuery,
  addEntity,
  addComponent,
  hasComponent,
  pipe,
  removeComponent,
  removeEntity,
} from 'bitecs'
import { Anim } from './animations'
import { Vector3 } from 'three'
import * as pl from 'planck'

export const Vec3 = { x: Types.f32, y: Types.f32, z: Types.f32 }
export const Position = defineComponent(Vec3)
export const Rotation = defineComponent({y:Types.f32})
export const RenderType = defineComponent({m:Types.ui8})
export const Selected = defineComponent()
export const MovementTarget = defineComponent(Vec3)
export const AttackTarget = defineComponent({y:Types.eid})
export const Moving = defineComponent()
export const Fighter = defineComponent({d:Types.f32,rest:Types.f32,rate:Types.f32,team:Types.ui8})
export const Body = defineComponent({r:Types.f32,t:Types.ui8}) // mask and cat correspond to fixture filter/category in Planck
export const Hit = defineComponent({v:Types.eid})
export const Health = defineComponent({h:Types.f32})
export const Mob = defineComponent()
export const Gnome = defineComponent()
export const MushroomHouse = defineComponent({t:Types.f32,b:Types.f32}) // Gnome Spawn Timer, percentage fully built
export const TriggerAnimation = defineComponent({a:Types.ui8})
export const Death = defineComponent()

export const movementQuery = defineQuery([Position,Rotation])
export const renderQuery = defineQuery([Position,Rotation])
export const selectedQuery = defineQuery([Selected])
export const bodyQuery = defineQuery([Position,Body])
export const animationTriggerQuery = defineQuery([TriggerAnimation])
export const fighterQuery = defineQuery([Fighter])
export const damageQuery = defineQuery([Hit,Health,Fighter])
export const hitQuery = defineQuery([Hit])
export const movementTargetQuery = defineQuery([MovementTarget,Position,Body])
export const deathQuery = defineQuery([Death])
export const mushroomHouseQuery = defineQuery([MushroomHouse])

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
      addComponent(world, Moving, eid)
      const dot = vel.y
      const det = vel.x
      Rotation.y[eid] = Math.atan2(det,dot)
    }else{
      removeComponent(world, Moving, eid)
    }
  }
  plWorld.step(1/60,10,8)
  plWorld.clearForces()

  for (let c = plWorld.getContactList(); c; c = c.getNext()) {
    const eid_a = c.getFixtureA().m_body.eid
    const eid_b = c.getFixtureB().m_body.eid
    // if we are contacting enemies
    // last contact "wins"
    if(hasComponent(world,Fighter,eid_a) && hasComponent(world,Fighter,eid_b) && Fighter.team[eid_a] != Fighter.team[eid_b]){
      // CONSIDER do we necessarily want to attack on every contact?
      // Or should we only attack if this is their AttackTarget?
      addComponent(world, Hit, eid_a)
      Hit.v[eid_a] = eid_b
      addComponent(world, Hit, eid_b)
      Hit.v[eid_b] = eid_a
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
      Health.h[eid_victim] -= Fighter.d[eid]
      if(Health.h[eid_victim] <= 0){
        // Death
        addComponent(world,TriggerAnimation,eid_victim) 
        TriggerAnimation.a[eid_victim] = Anim.die // die
        addComponent(world,Death,eid_victim)
      }else{
        addComponent(world,TriggerAnimation,eid_victim) 
        TriggerAnimation.a[eid_victim] = Anim.hit // hit
      }
      addComponent(world,TriggerAnimation,eid_victim) 
      TriggerAnimation.a[eid_victim] = Anim.attack // attack
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

  // Clear hits after processing
  hitQuery(world).forEach( (eid) => removeComponent(world,Hit,eid))

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
        body.setLinearVelocity(Vec2(v1.x,v1.z))
      }
    }
  }
  return world
}


// TODO process gnome hits as build-juice
export const houseSystem = (world) => {
  const { time: { delta } } = world
  const ents = mushroomHouseQuery(world)
  ents.forEach( (eid) => {
    if(MushroomHouse.b[eid] < 1){
      // still building
      MushroomHouse.b[eid] += delta/10000
    }else{
      // count timer
      MushroomHouse.t[eid] += delta
      // if we have reached gnome spawn time, spawn a gnome and reset timer
      if(MushroomHouse.t[eid] > 10000){
        console.log("spawning House Gnome")
        spawnGnome(Position.x[eid],Position.z[eid]+Body.r[eid]*2.5,world)
        MushroomHouse.t[eid] = 0
      }
    }
  })
  return world
}

export const deathSystem = (world) => {
  const ents = deathQuery(world)
  for(let i =0; i< ents.length; i++){
    const eid = ents[i]
    // CONSIDER what do I do about finishing animation?
    removeEntity(world,eid) 
    if(plBodyMap.has(eid)){
      const body_to_remove = plBodyMap.get(eid)
      plWorld.destroyBody(body_to_remove)
      plBodyMap.delete(eid)
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

// SPAWN FUNCTIONS

export const spawnGnome = (x,z,world) => {
  const eid = addEntity(world)
  addComponent(world, Position, eid)
  addComponent(world, Rotation, eid)
  addComponent(world, Body, eid)
  addComponent(world, Health, eid)
  addComponent(world, Gnome, eid)
  addComponent(world, Fighter, eid)
  addComponent(world, RenderType ,eid)
  RenderType.m[eid] = 0
  Position.x[eid] = x
  Position.z[eid] = z 
  Rotation.y[eid] = 0
  Body.r[eid] = 2
  Body.t[eid] = 2
  Health.h[eid] = 100
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
  addComponent(world, RenderType ,eid)
  RenderType.m[eid] = 1
  Position.x[eid] = x
  Position.z[eid] = z 
  Rotation.y[eid] = 0
  Body.r[eid] = 2
  Body.t[eid] = 2
  Health.h[eid] = 100
  MovementTarget.x[eid] = 0
  MovementTarget.y[eid] = 0
  MovementTarget.z[eid] = 0
  Fighter.d[eid] = 20
  Fighter.rate[eid] = 2000  // hit every 1 sec
  Fighter.rest[eid] = 0  // ready to hit if 0
  Fighter.team[eid] = 1 // gnome or mob
  return eid
}

export const spawnHouse = (x,z,world) => {
  const eid = addEntity(world) 
  addComponent(world, Position, eid)
  addComponent(world, Rotation, eid)
  addComponent(world, Body, eid)
  addComponent(world, MushroomHouse, eid)
  addComponent(world, RenderType ,eid)
  RenderType.m[eid] = 2
  Position.x[eid] = x
  Position.z[eid] = z 
  Rotation.y[eid] = 0
  Body.r[eid] = 7 
  Body.t[eid] = 1
  MushroomHouse.t[eid] = 10000 // Every 10 seconds
  MushroomHouse.b[eid] = 0 // Build in 10 seconds
  return eid
}