import './index.css'
import { Clock,Vector3,Scene,PerspectiveCamera,WebGLRenderer,RepeatWrapping, PlaneGeometry,TextureLoader,MeshStandardMaterial,Mesh,AmbientLight, DirectionalLight, AnimationMixer, LoadingManager, Group } from 'three'
import grassTextureUrl from './assets/tex/grass.png'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import * as SkeletonUtils from  'three/examples/jsm/utils/SkeletonUtils'
import gnomeFBXUrl from './assets/gnome_skin_mixamo_idle.fbx'
import walkFBXUrl from './assets/gnome_mixamo_walking.fbx'
import { createWorld,pipe } from 'bitecs';
import { spawnGnome,movementQuery,Position,movementSystem,timeSystem, Velocity } from './GameSystems'

const models = new Map() 
const mixers = new Map()

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
  loader.load( url, (scene) => {
    const model = {'scene':scene,'animations':{}} 
    models.set(name,model)
    animations.forEach( ({name,url}) => {
      loader.load(url, ({animations}) => {
        model.animations[name] = animations[0]
      })
    })
  })
}

function obj3d_from_model(name,has_skeleton){
  if(has_skeleton){
    const model = models.get(name)
    const obj = SkeletonUtils.clone(model.scene)
    obj.actions = {}
    const mixer = new AnimationMixer(obj)
    obj.actions.idle = mixer.clipAction(model.scene.animations[0],obj)

    Object.keys(model.animations).map( key => {
      const action = mixer.clipAction(model.animations[key])
      obj.actions[key] = action
    })
    mixers.set(obj.uuid,mixer)
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
    const gnome_obj = obj3d_from_model("gnome",true)
    const gnome = new Group()
    gnome_obj.scale.x=0.01
    gnome_obj.scale.y=0.01
    gnome_obj.scale.z=0.01
    gnome_obj.rotation.y =0 
    gnome.add(gnome_obj)
    gnome_obj.actions.walk.play()
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
  const clock = new Clock();
  // debug
  window.scene = scene
  window.camera = camera

  // Create Scene BG
  create_ground_and_lights(scene)

  // Init Controls
  const controls = new OrbitControls(camera,renderer.domElement)

  // Init Game ECS
  const world = createWorld()
  world.time = { delta: 0, elapsed: 0, then: performance.now() }
  const entity_to_object3d = new Map() // eid to Object3d
  const renderSystem = (world) => {
    movementQuery(world).forEach( (eid) => {
      const obj3d = entity_to_object3d.get(eid)
      if(obj3d){
        obj3d.position.x = Position.x[eid]
        obj3d.position.z = Position.z[eid]
        if(Velocity.x[eid] > 0 && Velocity.z[eid] > 0){
          obj3d.lookAt(new Vector3(obj3d.position.x + Velocity.x[eid],0,obj3d.position.z+Velocity.z[eid]))
        }
      }
    })
  }
  const pipeline = pipe(timeSystem,movementSystem,renderSystem)

  // Load FBX Models
  const manager = new LoadingManager()
  manager.onLoad = () => {
    console.log("Loading complete!")
    spawn_gnomes(25,scene,world,entity_to_object3d)
  }
  const loader = new FBXLoader(manager)
  load_model(loader,'gnome',gnomeFBXUrl,[{name:'walk',url:walkFBXUrl}])

  // Resize Handler
  window.addEventListener( 'resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }, false );

  // Animation Loop
  const animate = () => {
    const delta = clock.getDelta(); 
    for(let mixer of mixers.values()){
      mixer.update(delta)
    }
    pipeline(world)
  	requestAnimationFrame( animate )
    controls.update()
  	renderer.render( scene, camera )
  }
  animate()
}

init()