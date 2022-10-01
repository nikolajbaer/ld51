
import { useLoader } from '@react-three/fiber'
import { useEffect } from 'react'
import { RepeatWrapping, TextureLoader } from 'three'
import grassTextureUrl from './assets/tex/grass.png'
import grassNormalTextureUrl from './assets/tex/grass_normal.png'

export function Board(){
  const texture = useLoader(TextureLoader, grassTextureUrl)
  //const normal = useLoader(TextureLoader, grassNormalTextureUrl)

  useEffect( () => {
    if(texture) {
      texture.wrapS = texture.wrapT = RepeatWrapping
      texture.repeat.set(80, 80);
      texture.anisotropy = 16;
    }
  },[texture])

  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow={true}>
      <planeGeometry args={[1000,1000]} />
      <meshStandardMaterial map={texture}  />
    </mesh>
  </group>
}
