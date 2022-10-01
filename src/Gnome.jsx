import { useFBX,useAnimations } from '@react-three/drei'
import { useEffect } from 'react'
import gnomeFBXUrl from './assets/gnome_mixamo_guitar.fbx'

export function Gnome(){
  const gnome = useFBX(gnomeFBXUrl)
  console.log(gnome)
  gnome.animations[0].name = "dancing"
  const { actions, ref } = useAnimations(gnome.animations)

  useEffect(() => {
    actions?.dancing.play()
  },[gnome])

  return <primitive ref={ref} object={gnome} scale={[0.01,0.01,0.01]} position={[0,-3,0]} />
}