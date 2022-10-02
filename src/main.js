import './index.css'
import { Fog,Raycaster,LineLoop,LineBasicMaterial,Clock,Vector3,Scene,PerspectiveCamera,WebGLRenderer,RepeatWrapping, PlaneGeometry,TextureLoader,MeshStandardMaterial,Mesh,AmbientLight, DirectionalLight, AnimationMixer, LoadingManager, Group, MeshBasicMaterial,BufferGeometry, PCFSoftShadowMap } from 'three'
import grassTextureUrl from './assets/tex/grass.png'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import * as SkeletonUtils from  'three/examples/jsm/utils/SkeletonUtils'
import gnomeFBXUrl from './assets/gnome_skin_mixamo_idle.fbx'
import walkFBXUrl from './assets/gnome_mixamo_walking.fbx'
import skelFBXUrl from './assets/skeleton_mixamo_idle.fbx'
import { createWorld,pipe, removeComponent,addComponent } from 'bitecs';
import { spawnGnome,renderQuery,Rotation,Position,movementSystem,timeSystem,Selected, selectedQuery, MovementTarget,targetingSystem, spawnMob } from './GameSystems'
import { configure_selections } from './selections';


const models = new Map() 
const mixers = new Map()

function create_ground_and_lights(scene){
  // Create Ground / Lighting
  const ambient_light = new AmbientLight( 0x404040 ); // soft white light
  scene.add( ambient_light );
  const directional_light = new DirectionalLight("#eeeeff",1)
  directional_light.position.y = 10 
  directional_light.castShadow = true
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
  ground.name = "ground"
  scene.add( ground );
}

function load_model(loader,name,url,animations){
  loader.load( url, (scene) => {
    const model = {'scene':scene,'animations':{}} 
    models.set(name,model)
    animations.forEach( ({name,url}) => {
      loader.load(url, ({animations}) => {
        model.animations[name] = animations[0]
        animations[0].name = name
      })
    })
  })
}

function obj3d_from_model(name,has_skeleton){
  if(has_skeleton){
    const model = models.get(name)
    const obj = SkeletonUtils.clone(model.scene)
    obj.traverse( function ( child ) {
      if ( child.isMesh ) {
        child.castShadow = true
        child.receiveShadow = true
      }
    });
    obj.actions = {}
    const mixer = new AnimationMixer(obj)
    model.scene.animations[0].name = "idle"
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
  // create a little circle selection highlight thingy
  const selectGeometry = new BufferGeometry()
  selectGeometry.setFromPoints([...Array(31).keys()].map( i => {
    const r = 200
    const theta = Math.PI*2/32 * i
    return new Vector3(r*Math.sin(theta),0,r*Math.cos(theta))
  }))
  const selectMaterial = new LineBasicMaterial({color:"white"})

  // Spawn Gnomes
  for(let i=0;i<count;i++){
    const x = (i%5 - 2.5) * 5 
    const z = (Math.floor(i/5) - 2.5) * 5
    const eid = spawnGnome(x,z,world)
    const gnome = obj3d_from_model("gnome",true)
    gnome.children.filter(m => m.type == 'SkinnedMesh').forEach( m => m.selectable = true)
    const selectLines = new LineLoop(selectGeometry,selectMaterial)
    selectLines.position.y = 2
    selectLines.name = 'selection_highlight'
    //selectLines.lookAt(camera)
    selectLines.visible = false
    gnome.add(selectLines)
    gnome.select_mesh = selectLines
    gnome.scale.x=0.01
    gnome.scale.y=0.01
    gnome.scale.z=0.01
    gnome.actions.walk.play()
    entity_to_object3d.set(eid,gnome)
    scene.add(gnome)
  }
}

function init(){
  // Init Three Scene
  const scene = new Scene();
  const color = 0x000000;
  const density = 0.1;
  scene.fog = new Fog(color, density,400);
  const camera = new PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 )
  camera.near = 0.5
  camera.far = 5000
  camera.position.x = 30;  
  camera.position.y = 75;  
  camera.position.z = 45;  
  camera.lookAt(new Vector3(0,0,0))
  const renderer = new WebGLRenderer()
  renderer.setSize( window.innerWidth, window.innerHeight )
  renderer.shadowMap.enabled = true
  document.getElementById('root').appendChild( renderer.domElement )
  const clock = new Clock();
  // debug
  window.scene = scene
  window.camera = camera

  // Create Scene BG
  create_ground_and_lights(scene)

  // Init Controls
  const raycaster = new Raycaster();
  const controls = new OrbitControls(camera,renderer.domElement)
  controls.enablePan = false
  //controls.enabled = false
  // Selection box
  configure_selections(camera,scene,renderer,(obj3d) => {
    // item selected
    addComponent(world,Selected,obj3d.parent.eid)
    obj3d.parent.select_mesh.visible = true
  },(obj3d) => {
    // item deselected
    removeComponent(world,Selected,obj3d.parent.eid)
    obj3d.parent.select_mesh.visible = false
  })
  document.addEventListener('click', (event) => {
    if(event.button == 0){ // LMB
      const px = ( event.clientX / window.innerWidth ) * 2 - 1;
	    const py = - ( event.clientY / window.innerHeight ) * 2 + 1;
      console.log(event)
      raycaster.setFromCamera({x:px,y:py},camera)
      const intersects = raycaster.intersectObjects( scene.children )
      console.log(intersects)
      if(intersects.length){
        if(intersects[0].object.name == "ground"){
          const target = intersects[0].point
          console.log("Targeting",target.x,target.z)
          const ents = selectedQuery(world)
          ents.forEach( (eid) => {
            addComponent(world,MovementTarget,eid)
            MovementTarget.x[eid] = target.x
            MovementTarget.z[eid] = target.z
          })
        }
      }
    }
  })

  // Init Game ECS
  const world = createWorld()
  world.time = { delta: 0, elapsed: 0, then: performance.now() }
  const entity_to_object3d = new Map() // eid to Object3d
  const renderSystem = (world) => {
    renderQuery(world).forEach( (eid) => {
      const obj3d = entity_to_object3d.get(eid)
      obj3d.eid = eid
      if(obj3d){
        obj3d.position.x = Position.x[eid]
        obj3d.position.z = Position.z[eid]
        obj3d.rotation.y = Rotation.y[eid]
        if(obj3d.actions){
          if(false){ //Velocity.x[eid] > 0 && Velocity.z[eid] > 0){
            if(!obj3d.actions.walk.isRunning()){
              obj3d.actions.walk.play()
            }
          }else{
            if(!obj3d.actions.idle.isRunning()){
              obj3d.actions.idle.play()
            }
          }
        }
      }
    })
    // TODO removedQuery?
  }
  const pipeline = pipe(timeSystem,targetingSystem,movementSystem,renderSystem)

  // Load FBX Models
  const manager = new LoadingManager()
  manager.onLoad = () => {
    console.log("Loading complete!")
    spawn_gnomes(25,scene,world,entity_to_object3d)
  }
  const loader = new FBXLoader(manager)
  load_model(loader,'gnome',gnomeFBXUrl,[{name:'walk',url:walkFBXUrl}])
  load_model(loader,'skeleton',skelFBXUrl,[])

  // Resize Handler
  window.addEventListener( 'resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }, false );

  let level = 3
  const mobSpawnInterval = setInterval(() => {
    for(let i=0;i<level;i++){
      const r = 200
      const theta = Math.random() * Math.PI * 2
      const eid = spawnMob(r*Math.sin(theta),r*Math.cos(theta),world)
      const skel = obj3d_from_model("skeleton",true)
      skel.scale.x=0.03
      skel.scale.y=0.03
      skel.scale.z=0.03
      //skel.actions.walk.play()
      entity_to_object3d.set(eid,skel)
      scene.add(skel)
    }
  },10000)

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