import { useFBX,useAnimations } from '@react-three/drei'
import { useEffect } from 'react'
import gnomeFBXurl from './assets/gnome_mixamo_dancing.fbx'

export function Gnome(){
  const gnome = useFBX(gnomeFBXurl)
  console.log(gnome)
  gnome.animations[0].name = "dancing"
  const { actions, ref } = useAnimations(gnome.animations)

  useEffect(() => {
    actions?.dancing.play()
  },[gnome])

  return <primitive ref={ref} object={gnome} scale={[0.01,0.01,0.01]} position={[0,-3,0]} />
}