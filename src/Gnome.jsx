import { useFBX,useAnimations } from '@react-three/drei'
import { useEffect,useState,useMemo, forwardRef } from 'react'
import * as SkeletonUtils from  'three/examples/jsm/utils/SkeletonUtils'

import gnomeFBXUrl from './assets/gnome_skin_idle1.fbx'
import idleFBXUrl from './assets/gnome_skin_idle1.fbx'
import walkFBXUrl from './assets/gnome_walking.fbx'


// TODO Reference https://codesandbox.io/s/react-three-fiber-wildlife-nrbnq?file=/src/Model.js
export const Gnome = forwardRef(({position},ref) => {
  const scene = useFBX(gnomeFBXUrl) 
  const gnome = useMemo(() => SkeletonUtils.clone(scene),[scene])
  const [animations] = useState(() => {
    const clips = [
      useFBX(idleFBXUrl).animations[0],
      useFBX(walkFBXUrl).animations[0],
    ]
    clips[0].name = 'idle'
    clips[1].name = 'walk'
    return clips
  })
  const { actions } = useAnimations(animations,gnome)
  console.log(actions)

  useEffect(() => {
    actions.walk?.play()
    return () => actions.walk?.reset()
  },[gnome])

  return <group name="gnome" position={position}>
    <primitive ref={ref} object={gnome} scale={[0.01,0.01,0.01]} />
  </group>
})