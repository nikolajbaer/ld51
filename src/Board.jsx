
import { useLoader } from '@react-three/fiber'
import { useEffect } from 'react'
import { RepeatWrapping, TextureLoader } from 'three'
import grassTextureUrl from './assets/tex/grass.png'

export function Board(){
  const colorMap = useLoader(TextureLoader, grassTextureUrl)

  useEffect( () => {
    if(colorMap) {
      colorMap.wrapS = colorMap.wrapT = RepeatWrapping
      colorMap.repeat.set(8, 8);
      colorMap.anisotropy = 16;
    }
  },[colorMap])

  return <group>
    <mesh rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[100,100]} />
      <meshStandardMaterial map={colorMap} />
    </mesh>
  </group>
}
