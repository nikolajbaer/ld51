import './index.css'
import { Scene,PerspectiveCamera,WebGLRenderer,RepeatWrapping, PlaneGeometry,TextureLoader,MeshStandardMaterial,Mesh,AmbientLight, DirectionalLight, AnimationMixer, LoadingManager } from 'three'
import grassTextureUrl from './assets/tex/grass.png'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import * as SkeletonUtils from  'three/examples/jsm/utils/SkeletonUtils'
import gnomeFBXUrl from './assets/gnome_skin_mixamo_idle.fbx'
import walkFBXUrl from './assets/gnome_mixamo_walking.fbx'
import { newGameWorld,createPipeline,spawnGnome,movementQuery,Position } from './Game'

const models = new Map() 

function create_ground_and_lights(scene){
  // Create Ground / Lighting
  const ambient_light = new AmbientLight( 0x404040 ); // soft white light
  scene.add( ambient_light );
  const directional_light = new DirectionalLight({color:"#eeeeff",castShadow:true})
  scene.add( directional_light )

  const texture = new TextureLoader().load( grassTextureUrl );
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(80, 80);
  texture.anisotropy = 16;
  const geometry = new PlaneGeometry( 1000, 1000);
  const material = new MeshStandardMaterial( { map: texture, repeat: RepeatWrapping } );
  const ground = new Mesh( geometry, material );
  ground.receiveShadow = true
  ground.rotation.x = -Math.PI/2
  scene.add( ground );
}

function load_model(loader,name,url,animations){
  return loader.load( url, (scene) => {
    console.log("Setting model for ",name)
    models.set(name,{'scene':scene,'animations':{}})
    // TODO load animation
  })
}

function obj3d_from_model(name,has_skeleton){
  console.log("Creating obj3d for ",name)
  if(has_skeleton){
    const obj = SkeletonUtils.clone(models.get(name).scene)
    return obj
  }
  const obj = models.get(name).scene.clone()
  return obj
}

function spawn_gnomes(count,scene,world,entity_to_object3d){
  // Spawn Gnomes
  for(let i=0;i<count;i++){
    const x = (i%5 - 2.5) * 5 
    const z = (Math.floor(i/5) - 2.5) * 5
    const eid = spawnGnome(x,z,world)
    const gnome = obj3d_from_model("gnome",true)
    gnome.scale.x=0.01
    gnome.scale.y=0.01
    gnome.scale.z=0.01
    entity_to_object3d.set(eid,gnome)
    scene.add(gnome)
  }
}

function init(){
  // Init Three Scene
  const scene = new Scene();
  const camera = new PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 )
  camera.near = 0.5
  camera.far = 5000
  camera.position.x = 30;  
  camera.position.y = 75;  
  camera.position.z = 45;  
  const renderer = new WebGLRenderer()
  renderer.setSize( window.innerWidth, window.innerHeight )
  document.getElementById('root').appendChild( renderer.domElement )
  // debug
  window.scene = scene
  window.camera = camera

  // Create Scene BG
  create_ground_and_lights(scene)

  // Init Controls
  const controls = new OrbitControls(camera,renderer.domElement)

  // Init Game ECS
  const world = newGameWorld()
  const pipeline = createPipeline()
  const entity_to_object3d = new Map() // eid to Object3d

  // Load FBX Models
  const manager = new LoadingManager()
  manager.onLoad = () => {
    console.log("Loading complete!")
    spawn_gnomes(25,scene,world,entity_to_object3d)
  }
  const loader = new FBXLoader(manager)
  load_model(loader,'gnome',gnomeFBXUrl,[])

  // Animation Loop
  const animate = () => {
    pipeline(world)
    movementQuery(world).forEach( (eid) => {
      const obj3d = entity_to_object3d.get(eid)
      if(obj3d){
        obj3d.position.x = Position.x[eid]
        obj3d.position.z = Position.z[eid]
      }
    })
  	requestAnimationFrame( animate )
    controls.update()
  	renderer.render( scene, camera )
  }
  animate()
}

init()