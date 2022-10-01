import { useEffect,useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
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

  return (
    <>
      <Canvas camera={{ position: [-40, 45, -25], near: 5, far: 500, fov: 12 }}>
        <ambientLight intensity={0.5} />
        <directionalLight color="#eeeeff" position={[0, 20, 20]}  />
        <mesh>
          <boxGeometry args={[1,1,1]} />
          <meshStandardMaterial color="blue" />
        </mesh>
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
