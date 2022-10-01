import { useEffect,useState,useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls,Center } from '@react-three/drei'
import { Board } from './Board'
import { Entities } from './Entities'
import './App.css'
import { newGameWorld,createPipeline,spawnGnome, movementQuery } from './Game'

function App() {
  const text=['Something','Happens','Every','10','Seconds']
  const world = useMemo(() => newGameWorld())
  const pipeline = useMemo(() => createPipeline())

  useEffect( () => {
    if(movementQuery(world).length==0){
      for(let i=0;i<25;i++){
        const x = (i%5 - 2.5) * 5 
        const z = (Math.floor(i/5) - 2.5) * 5
        spawnGnome(x,z,world)
      }
    }
  },[world])

  useEffect( () => {
    const interval = setInterval(()=>{
      pipeline(world) 
      // TODO refactor this so we update gnome positions in useFrame via movementQuery
    },1000/60)
    return () => clearInterval(interval)
  })

  return (
    <>
      <Canvas camera={{ position: [150, 100, 200], near: 5, far: 5000, fov: 12 }}>
        <ambientLight intensity={0.1} />
        <directionalLight color="#eeeeff" position={[0, 20, 20]} shadow={true} />
        <Board />
        <Entities world={world} />
        <OrbitControls />
      </Canvas>
      <div className="title">
        <h1>Ludum Dare 51</h1>
      </div>
    </>
  )
}

export default App
