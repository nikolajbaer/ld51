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
    return
    if(this.moving){
      this.current.crossFadeTo(this.actions.walk,0.5,false)
    }else{
      this.current.crossFadeTo(this.actions.idle,0.5,false)
    }
  }

  trigger(next){
    return
    if(this.current_id == next){ return }
    this.current.crossFadeTo(this.actions[next],0.5,false)
    this.current.reset()
    this.current = this.actions[next]
  }

}