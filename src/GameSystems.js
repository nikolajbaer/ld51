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
  entityExists,
  Not,
} from 'bitecs'
import { Anim } from './animations'
import { Sounds } from './sounds'
import { Vector3 } from 'three'
import * as pl from 'planck'

export const Vec3 = { x: Types.f32, y: Types.f32, z: Types.f32 }
export const Position = defineComponent(Vec3)
export const Rotation = defineComponent({y:Types.f32})
export const RenderType = defineComponent({m:Types.ui8})
export const Selected = defineComponent()
export const MovementTarget = defineComponent(Vec3)
export const AttackTarget = defineComponent({a:Types.eid})
export const Defend = defineComponent({x:Types.f32,z:Types.f32}) // coord of box to index mobs
export const Moving = defineComponent()
export const Fighter = defineComponent({d:Types.f32,rest:Types.f32,rate:Types.f32,team:Types.ui8})
export const Body = defineComponent({r:Types.f32,t:Types.ui8,vel:Types.f32}) // mask and cat correspond to fixture filter/category in Planck
export const Hit = defineComponent({v:Types.eid})
export const Health = defineComponent({h:Types.f32})
export const Mob = defineComponent()
export const Gnome = defineComponent()
export const MushroomHouse = defineComponent({t:Types.f32,b:Types.f32}) // Gnome Spawn Timer, percentage fully built
export const TriggerAnimation = defineComponent({a:Types.ui8})
export const TriggerSound = defineComponent({s:Types.ui8})
export const Death = defineComponent()
export const CookPot = defineComponent()

export const movementQuery = defineQuery([Position,Rotation])
export const renderQuery = defineQuery([Position,Rotation])
export const selectedQuery = defineQuery([Selected])
export const bodyQuery = defineQuery([Position,Body])
export const animationTriggerQuery = defineQuery([TriggerAnimation])
export const fighterQuery = defineQuery([Fighter])
export const damageQuery = defineQuery([Hit,Health,Fighter])
export const hitQuery = defineQuery([Hit])
export const movementTargetQuery = defineQuery([MovementTarget,Position,Body])
export const attackTargetQuery = defineQuery([AttackTarget])
export const deathQuery = defineQuery([Death])
export const mushroomHouseQuery = defineQuery([MushroomHouse])
export const cookpotQuery = defineQuery([CookPot])
export const soundTriggerQuery = defineQuery([TriggerSound])
const mobQuery = defineQuery([Mob])
const defenderQuery = defineQuery([Defend,Not(AttackTarget)])

// TODO use planck to operate movement with collisions
const plWorld = pl.World({})
const Vec2 = pl.Vec2
const plBodyMap = new Map()
const PL_BODY_TYPES = ['kinematic','static','dynamic']

const handleHit = (a,b,world) => {
  if(hasComponent(world,Fighter,a)){
    if(hasComponent(world,Fighter,b) && Fighter.team[a] != Fighter.team[b]){
      addComponent(world, Hit, a)
      Hit.v[a] = b
    }else if(hasComponent(world,Mob,a) && hasComponent(world,CookPot,b)){
      addComponent(world, Hit, a)
      Hit.v[a] = b
    }
  }
}

const triggerSound = (world,eid,sound) => {
  if(hasComponent(world,Mob,eid)){
    addComponent(world,TriggerSound,eid)
    TriggerSound.s[eid] = sound+10
  }else if(hasComponent(world,Gnome,eid)){
    addComponent(world,TriggerSound,eid)
    TriggerSound.s[eid] = sound
  }
}

export const movementSystem = (world) => {
  const { time: { delta } } = world
  const ents = bodyQuery(world)
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]
    let body = plBodyMap.get(eid)
    if(body==undefined){
      body = plWorld.createBody({
        type:PL_BODY_TYPES[Body.t[eid]],
        position:Vec2(Position.x[eid],Position.z[eid]),
        angle:Rotation.y[eid],
        linearDamping: 1,
      })
      body.eid = eid
      const fixture = pl.Circle(Body.r[eid])
      body.createFixture(fixture)
      plBodyMap.set(eid,body)
    }

    const pos = body.getPosition()
    // store how much we moved in the last tick
    Position.x[eid] = pos.x
    Position.z[eid] = pos.y 
    // handle rotation based on where unit is going
    //Rotation.y[eid] = body.getAngle()

    // Rotate in direction of movement
    const vel = body.getLinearVelocity()
    if(vel.length() > 0.1){
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
    // if we are contacting enemies or mobs are attacking the cook pot
    // last contact "wins"
    handleHit(eid_a,eid_b,world)
    handleHit(eid_b,eid_a,world)
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
        triggerSound(world,eid_victim,Sounds.die)
      }else{
        addComponent(world,TriggerAnimation,eid_victim) 
        TriggerAnimation.a[eid_victim] = Anim.hit // hit
      }
      addComponent(world,TriggerAnimation,eid) 
      TriggerAnimation.a[eid] = Anim.attack // attack
      triggerSound(world,eid,Sounds.grunt)
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

const MIN_DIST = 1 

export const targetingSystem = (world) => {
  // Start by updating any ents with attack targets
  const a_ents = attackTargetQuery(world)
  a_ents.forEach( (eid) => {
    if(entityExists(world,AttackTarget.a[eid]) && hasComponent(world,Position,AttackTarget.a[eid])){
      MovementTarget.x[eid] = Position.x[AttackTarget.a[eid]]
      MovementTarget.z[eid] = Position.z[AttackTarget.a[eid]]
    }else{
      removeComponent(world,AttackTarget,eid) 
    }
  })
  // Then go through all ents with movmeent targets, and point them at it with their velocity
  const ents = movementTargetQuery(world)
  for(let i =0; i< ents.length; i++){
    const eid = ents[i]
    const v = new Vector3(MovementTarget.x[eid] - Position.x[eid],0,MovementTarget.z[eid] - Position.z[eid])
    if(v.length() < MIN_DIST){ 
      removeComponent(world,MovementTarget,eid)
      const body = plBodyMap.get(eid)
      if(body){
        body.setLinearVelocity(Vec2(0,0))
      }
    }else{
      const v1 = v.normalize().multiplyScalar(Body.vel[eid])
      const body = plBodyMap.get(eid)
      if(body){
        body.setLinearVelocity(Vec2(v1.x,v1.z))
      }
    }
  }
  return world
}

const Z_W = 40
const getZone = (x,y) => {
  const i = Math.floor((x-Z_W/2)/Z_W)
  const j = Math.floor((y-Z_W/2)/Z_W)
  return `${i}x${j}` 
}

export const defendSystem = (world) => {
  
  const m_ents = mobQuery(world)
  const zones = new Map()
  m_ents.forEach( (eid) => {
    const x = Position.x[eid] 
    const z = Position.z[eid]
    const zone = getZone(x,z)
    if(!zones.has(zone)){
      zones.set(zone,[eid])
    }else{
      zones.get(zone).push(eid)
    }
  })

  const d_ents = defenderQuery(world)
  d_ents.forEach( (eid) => {
    const x = Position.x[eid] 
    const z = Position.z[eid]
    const zone = getZone(x,z)
    if(zones.has(zone)){
      const attack_eid = zones.get(zone)[0]
      addComponent(world,AttackTarget,eid)
      AttackTarget.a[eid] = attack_eid
      removeComponent(world,Defend,eid)
    }
  })
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
        const r = 2.5 
        const theta = Math.random() * Math.PI * 2
        spawnGnome(r*Math.sin(theta) + Position.x[eid],r*Math.cos(theta)+Position.z[eid],world,true)
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

export const spawnGnome = (x,z,world,spawnSound) => {
  const eid = addEntity(world)
  addComponent(world, Position, eid)
  addComponent(world, Rotation, eid)
  addComponent(world, Body, eid)
  addComponent(world, Health, eid)
  addComponent(world, Gnome, eid)
  addComponent(world, Fighter, eid)
  addComponent(world, RenderType ,eid)
  if(spawnSound){
    addComponent(world, TriggerSound, eid)
    TriggerSound.s[eid] = Sounds.gnome_spawn
  }
  RenderType.m[eid] = 0
  Position.x[eid] = x
  Position.z[eid] = z 
  Rotation.y[eid] = 0
  Body.vel[eid] = 10
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
  addComponent(world, TriggerSound, eid)
  TriggerSound.s[eid] = Sounds.spawn + 10
  RenderType.m[eid] = 1
  Position.x[eid] = x
  Position.z[eid] = z 
  Rotation.y[eid] = 0
  Body.vel[eid] = 5
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

export const spawnPot = (x,z,world) => {
  const eid = addEntity(world)
  addComponent(world, Position, eid)
  addComponent(world, Rotation, eid)
  addComponent(world, Body, eid)
  addComponent(world, Health, eid)
  addComponent(world, RenderType ,eid)
  addComponent(world, CookPot, eid)
  RenderType.m[eid] = 3
  Position.x[eid] = x
  Position.z[eid] = z 
  Body.vel[eid] = 0
  Body.r[eid] = 6
  Body.t[eid] = 1
  Health.h[eid] = 2000
  return eid
}