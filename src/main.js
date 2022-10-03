import './index.css'
import { Vector2,Fog,Raycaster,LineLoop,LineBasicMaterial,Clock,Vector3,Scene,PerspectiveCamera,WebGLRenderer,RepeatWrapping, PlaneGeometry,TextureLoader,MeshStandardMaterial,Mesh,AmbientLight, DirectionalLight, AnimationMixer, LoadingManager, Group, MeshBasicMaterial,BufferGeometry, PCFSoftShadowMap,GridHelper, BoxGeometry } from 'three'
import grassTextureUrl from './assets/tex/grass.png'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import * as SkeletonUtils from  'three/examples/jsm/utils/SkeletonUtils'
import gnomeFBXUrl from './assets/gnome_skin_mixamo_idle.fbx'
import walkFBXUrl from './assets/gnome_mixamo_walking.fbx'
import skelFBXUrl from './assets/skeleton_mixamo_idle.fbx'
import houseFBXUrl from './assets/mushroom-house.fbx'
import { createWorld,pipe, removeComponent,addComponent, hasComponent, entityExists } from 'bitecs';
import { RenderType,spawnGnome,renderQuery,Rotation,Position,movementSystem,timeSystem,Selected, selectedQuery, MovementTarget,targetingSystem, spawnMob, damageSystem, deathSystem, animationTriggerQuery, TriggerAnimation,deathQuery, Moving, spawnHouse, houseSystem, AttackTarget,Mob, defendSystem, Defend } from './GameSystems'
import { configure_selections } from './selections';
import { Anim,ANIM_MAP,AnimationStateMachine } from './animations';

const models = new Map() 
const mixers = new Map()
const GRID_SZ = 20 
const GRID_CNT = 16 

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
  texture.repeat.set(40, 40);
  texture.anisotropy = 16;
  const geometry = new PlaneGeometry( 1000, 1000);
  const material = new MeshStandardMaterial( { map: texture, repeat: RepeatWrapping } );
  const ground = new Mesh( geometry, material );
  ground.receiveShadow = true
  ground.rotation.x = -Math.PI/2
  ground.name = "ground"
  scene.add( ground );

  // Create house building grid
  /*const gridHelper = new GridHelper( GRID_CNT*GRID_CNT, GRID_CNT,0x000000,0x000000 );
  gridHelper.position.y = 0.01
  gridHelper.material.linewidth = 2
  scene.add( gridHelper );
  */

  return ground
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
    obj.animstate = new AnimationStateMachine(obj.actions,Anim.idle)
    mixer.addEventListener('finished',() => obj.animstate.handleFinished())

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

function createEntityObject3d(eid){
  switch(RenderType.m[eid]){
    case 0: // gnome
      const gnome = obj3d_from_model("gnome",true)
      addSelectionCircle(gnome)
      gnome.children.filter(m => m.type == 'SkinnedMesh').forEach( m => m.selectable = true)
      gnome.scale.x=0.01
      gnome.scale.y=0.01
      gnome.scale.z=0.01
      scene.add(gnome)
      return gnome
    case 1:  // skel
      const skel = obj3d_from_model("skeleton",true)
      skel.scale.x=0.03
      skel.scale.y=0.03
      skel.scale.z=0.03
      scene.add(skel)
      return skel
    case 2: // house
      const house = obj3d_from_model("house",false)
      house.scale.set(0.5,0.5,0.5)
      scene.add(house)
      return house
  }
}

// create a little circle selection highlight thingy
const selectGeometry = new BufferGeometry()
selectGeometry.setFromPoints([...Array(31).keys()].map( i => {
  const r = 200
  const theta = Math.PI*2/32 * i
  return new Vector3(r*Math.sin(theta),0,r*Math.cos(theta))
}))
const selectMaterial = new LineBasicMaterial({color:"white"})
function addSelectionCircle(obj3d){
  const selectLines = new LineLoop(selectGeometry,selectMaterial)
  selectLines.position.y = 100 
  selectLines.name = 'selection_highlight'
  selectLines.visible = false
  obj3d.add(selectLines)
  obj3d.select_mesh = selectLines
}

function spawn_gnomes(count,scene,world,entity_to_object3d){
  // Spawn Initial Gnomes
  for(let i=0;i<count;i++){
    const x = (i%5 - 2.5) * 5 
    const z = (Math.floor(i/5) - 2.5) * 5
    spawnGnome(x,z,world)
  }
}

function init(){
  // Init Three Scene
  const scene = new Scene();
  const camera = new PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.1, 1000 )
  camera.near = 0.5
  camera.far = 5000
  camera.position.x = 0;  
  camera.position.y = 175;  
  camera.position.z = 175;  
  camera.lookAt(new Vector3(0,0,0))
  const renderer = new WebGLRenderer({antialias:true})
  renderer.setSize( window.innerWidth, window.innerHeight )
  renderer.shadowMap.enabled = true
  document.getElementById('root').appendChild( renderer.domElement )
  const clock = new Clock();
  // debug
  window.scene = scene
  window.camera = camera

  // Create Scene BG
  const ground = create_ground_and_lights(scene)

  // Init Controls 
  // What the mosue is currently assigned to do


  const controls = new OrbitControls(camera,renderer.domElement)
  controls.enablePan = false
  controls.enabled = false

  // Selection box
  configure_selections(camera,scene,renderer,(obj3d) => {
    // item selected. .might happen during cleanup cycle
    if(entityExists(world,obj3d.parent.eid)){
      addComponent(world,Selected,obj3d.parent.eid)
      obj3d.parent.select_mesh.visible = true
    }
  },(obj3d) => {
    // item deselected. .might happen during cleanup cycle
    if(entityExists(world,obj3d.parent.eid)){
      removeComponent(world,Selected,obj3d.parent.eid)
      obj3d.parent.select_mesh.visible = false
    }
  })

  const raycaster = new Raycaster();
  let pointer = new Vector2()
  let groundPos = null 
  let dropObject3d = null
  let ctrlDown = false

  //Keep track of pointer
  const snap = (v) => {
    const g = GRID_SZ/2
    let p = Math.floor(v/g) * g
    if(Math.abs(p) > (g*GRID_CNT)/2){
      p = (g*GRID_CNT/2) * ((v<0)?-1:1)
    }
    return p
  }

  document.addEventListener('pointermove', event => {
      pointer.set(( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1)
      raycaster.setFromCamera({x:pointer.x,y:pointer.y},camera)
      const intersect = raycaster.intersectObject( ground )
      if(intersect){
        groundPos = intersect[0].point
      }else{
        groundPos = null
      }
      if(dropObject3d){
        // TODO gridsnap
        dropObject3d.position.x = snap(groundPos.x)
        dropObject3d.position.z = snap(groundPos.z)
      }
  })

  document.addEventListener('mouseup', (event) => {
    if(event.button == 0){ // LMB
      if(dropObject3d!=null){
        house_timeout()
        spawnHouse(dropObject3d.position.x,dropObject3d.position.z,world) 
        scene.remove(dropObject3d)
        dropObject3d = null
      }else{
        const target_intersects = raycaster.intersectObjects( scene.children )
        // TODO intersect attack targets
        if(target_intersects[0].object.parent.eid != undefined){
          const target_eid = target_intersects[0].object.parent.eid
          if(hasComponent(world,Mob,target_eid)){
            selectedQuery(world).forEach( (eid) => {
              addComponent(world,AttackTarget,eid)
              AttackTarget.a[eid] = target_eid
              // explicit attack supercedes defend
              if(hasComponent(world,Defend,eid)){
                removeComponent(world,Defend,eid)
              }
            })
          }
        }else if(groundPos){
          const ents = selectedQuery(world)
          ents.forEach( (eid) => {
            addComponent(world,MovementTarget,eid)
            MovementTarget.x[eid] = groundPos.x
            MovementTarget.z[eid] = groundPos.z
            addComponent(world,Defend,eid)
            Defend.x[eid] = groundPos.x
            Defend.z[eid] = groundPos.z
          })
        }
      }
    }
  })

  document.addEventListener('keydown', (event) => {
    if(event.key == "Shift"){
      controls.enabled=true
    }else if(event.key == "Control"){
      ctrlDown = true
    }
  })
  document.addEventListener('keyup', (event) => {
    if(event.key=='Escape' && dropObject3d!=null){
      scene.remove(dropObject3d)
      dropObject3d = null
    }
    if(event.key == "Shift"){
      controls.enabled=false
    }else if(event.key == "Control"){
      ctrlDown = false
    }
  })
 
  // Init Game ECS
  const world = createWorld()
  world.time = { delta: 0, elapsed: 0, then: performance.now() }
  const entity_to_object3d = new Map() // eid to Object3d

  // WE build this system here to share scope with Three stuff
  const renderSystem = (world) => {
    renderQuery(world).forEach( (eid) => {
      let obj3d = entity_to_object3d.get(eid)
      if(!obj3d){
        obj3d = createEntityObject3d(eid) 
        obj3d.eid = eid
        entity_to_object3d.set(eid,obj3d)
      }
      obj3d.position.x = Position.x[eid]
      // no y.. 2d really
      obj3d.position.z = Position.z[eid]
      obj3d.rotation.y = Rotation.y[eid]
      if(obj3d.animstate){
        // update if we are moving
        obj3d.animstate.setMoving(hasComponent(world,Moving,eid))
      }
    })
    animationTriggerQuery(world).forEach( (eid) => {
      const anim = TriggerAnimation.a[eid]
      const obj3d = entity_to_object3d.get(eid)
      if(obj3d && obj3d.animstate){
        obj3d.animstate.trigger(ANIM_MAP[anim])
      }
      removeComponent(world,TriggerAnimation,eid)
    })

    deathQuery(world).forEach( (eid) => {
      const obj3d = entity_to_object3d.get(eid)
      if(obj3d){
        scene.remove(obj3d)
        entity_to_object3d.delete(eid)
      }
    })
    return world
  }

  const pipeline = pipe(timeSystem,houseSystem,targetingSystem,defendSystem,movementSystem,damageSystem,renderSystem,deathSystem)

  // Load FBX Models
  const manager = new LoadingManager()
  manager.onLoad = () => {
    console.log("Loading complete!")
    spawn_gnomes(4,scene,world,entity_to_object3d)
  }
  const loader = new FBXLoader(manager)
  load_model(loader,'gnome',gnomeFBXUrl,[{name:'walk',url:walkFBXUrl}])
  load_model(loader,'skeleton',skelFBXUrl,[])
  load_model(loader,'house',houseFBXUrl,[])

  // Resize Handler
  window.addEventListener( 'resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }, false );

  // Drop Button Handler
  const drop_button = document.getElementById("drop_house")
  const house_timeout = () => {
    drop_button.disabled = true
    let t = 10
    const countIval = setInterval(()=>{
      drop_button.innerText = "House in "+t
      t -= 1
    },1000)
    setTimeout(() =>{
      drop_button.disabled = false
      drop_button.innerText = "Drop House"
      clearInterval(countIval)
    },10000)
  }

  drop_button.addEventListener('click', (event) => {
    // set current drop item
    if(dropObject3d == null){
      dropObject3d = new Mesh(new PlaneGeometry(GRID_SZ/2,GRID_SZ/2,1,1),new MeshBasicMaterial({color:"lightblue",transparent:true,opacity:0.25}))
      dropObject3d.rotation.x=-Math.PI/2
      dropObject3d.position.y = 0.1
      scene.add(dropObject3d)
    }
    event.preventDefault()
  })
  // Mob Spawner
  let level = 1
  const spawnInterval = setInterval(() => {
    // Spawn Mob
    for(let i=0;i<level;i++){
      const r = 200
      const theta = Math.random() * Math.PI * 2
      spawnMob(r*Math.sin(theta),r*Math.cos(theta),world)
    }
    level += 0.5
  },10000)

  // start house button timeout
  house_timeout()

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