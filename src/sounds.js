import gnomeSpawnUrl from './assets/sounds/gnome_spawn.ogg'
import skelSpawnUrl from './assets/sounds/skel_spawn.ogg'
import gnomeGruntUrl from './assets/sounds/gnome_grunt.ogg'
import skelGruntUrl from './assets/sounds/skel_grunt.ogg'
import gnomeDieUrl from './assets/sounds/gnome_die.ogg'
import houseDropUrl from './assets/sounds/house_drop.ogg'
import skelDieUrl from './assets/sounds/skel_die.ogg'
import { AudioLoader,Audio } from 'three'

export const Sounds = {
  spawn: 0,
  grunt: 1,
  die: 2,
  ack: 3,
  // we add 10 for keys of skel sounds
}

export function load_sounds(manager,listener,sounds){
  const audio_loader = new AudioLoader(manager) 

  const to_load = [
    {url:gnomeSpawnUrl,key:0,vol:1},
    {url:skelSpawnUrl,key:10,vol:1},
    {url:gnomeGruntUrl,key:1,vol:1},
    {url:skelGruntUrl,key:11,vol:1},
    {url:gnomeDieUrl,key:2,vol:1},
    {url:houseDropUrl,key:"drop_house",vol:1},
    {url:skelDieUrl,key:12,vol:1},
  ]  
  to_load.forEach( (s) => {
    audio_loader.load(s.url, (buffer) => {
      const sound = new Audio(listener)
      sound.setBuffer(buffer)
      sound.setLoop( false )
      sound.setVolume( s.vol )
      sounds.set(s.key,sound)
    })
  })

}