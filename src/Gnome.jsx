import { useFBX,useAnimations } from '@react-three/drei'
import { useEffect,useState } from 'react'
import * as SkeletonUtils from  'three/examples/jsm/utils/SkeletonUtils'
import { AnimationClip } from 'three'

import gnomeFBXUrl from './assets/gnome_skin_idle1.fbx'
import idleFBXUrl from './assets/gnome_skin_idle1.fbx'

export function Gnome({position}){
  const [gnome] = useState(() => {
    const scene = SkeletonUtils.clone(useFBX(gnomeFBXUrl))
    return scene
  })
  const [animations] = useState( () => {
    const clips = [
      useFBX(idleFBXUrl).animations[0],
    ]
    clips[0].name = 'idle'
    return clips
  })
  const { actions, ref } = useAnimations(animations)

  useEffect(() => {
    actions?.idle.play()
  },[gnome])

  return <group name="gnome" position={position}>
    <primitive ref={ref} object={gnome} scale={[0.01,0.01,0.01]} />
  </group>
}