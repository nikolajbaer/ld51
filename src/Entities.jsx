import { Gnome } from './Gnome'
import { movementQuery,Position } from './Game'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

export function Entities({world}){
  const entitiesRef = useRef([])

  useEffect(() => {
    if(entitiesRef.current.length == 0){
      entitiesRef.current = Array(movementQuery(world).length).fill(null)
    }
  },[world])    

  useFrame(() => {
    // Figuring this out still..
    const ents = movementQuery(world)
    ents.forEach( (eid,i) => {
      entitiesRef.current[i].position.x = Position.x[eid]
      entitiesRef.current[i].position.z = Position.z[eid]
    })
  })

  const gnomes = movementQuery(world).map( (eid,i) => {
    return <Gnome 
          key={eid} 
          position={[Position.x[eid],0,Position.z[eid]]} 
          ref={e=>{ entitiesRef.current[i] = e }} 
    />
  })

  return <>
    {gnomes}
  </>
}

