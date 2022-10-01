import { useEffect,useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls,Center } from '@react-three/drei'
import { Gnome } from './Gnome'
import { Board } from './Board'
import './App.css'

function App() {
  const [counter,setCounter] = useState(0)
  const text=['Something','Happens','Every','10','Seconds']

  useEffect( () => {
    const interval = setInterval(()=>{
      setCounter((counter+1)%text.length)
    },2000)
    return () => clearInterval(interval)
  })

  const gnomes = [...Array(25).keys()].map( i => {
    const x = (i%5 - 2.5) * 10
    const z = (Math.floor(i/5) - 2.5) * 10
    return <Gnome key={i} position={[x,0,z]} />
  })

  return (
    <>
      <Canvas camera={{ position: [150, 100, 200], near: 5, far: 5000, fov: 12 }}>
        <ambientLight intensity={0.1} />
        <directionalLight color="#eeeeff" position={[0, 20, 20]}  />
        <Board />
        {gnomes}
        <OrbitControls />
      </Canvas>
      <div className="title">
        <h1>Ludum Dare 51</h1>
        {<div className="pulse">{text[counter]}</div>}
      </div>
    </>
  )
}

export default App
