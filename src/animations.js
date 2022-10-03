export const ANIM_MAP = [
  'idle',
  'walk',
  'attack',
  'hit',
  'die',
]
export const Anim = {
  idle: 0,
  walk: 1,
  attack: 2,
  hit: 3,
  die: 4,
}

export class AnimationStateMachine {
  constructor(actions,anim_id){
    this.actions = actions
    this.current_id = ANIM_MAP[anim_id]
    this.current = this.actions[this.current_id]
    this.current.play()
    this.moving = false
  }

  setMoving(moving){
    if(moving && !this.moving){
      this.trigger('walk')
    }else if(!moving && this.moving){
      this.trigger('idle')
    }
    this.moving = moving
  }

  handleFinished(){
    if(this.moving){
      this.trigger('walk') 
    }else{
      this.trigger('idle') 
    }
  }

  trigger(next){
    if(this.current_id == next){ return }
    if(!this.actions[next]){
      console.error("Woops, missing animation ",next)
      return
    }
    this.current.stop()
    this.actions[next].play()
    this.current.reset()
    this.current_id = next
    this.current = this.actions[next]
  }

}