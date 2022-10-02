export const ANIM_MAP = [
  'idle',
  'walk',
  'attack',
  'hit',
  'die',
]

export class AnimationStateMachine {
  constructor(actions,anim_id){
    this.actions = actions
    this.current_id = ANIM_MAP[anim_id]
    this.current = this.actions[this.current_id]
    this.current.play()
    this.moving = false
  }

  handleFinished(){
    if(this.moving){
    }
  }

  trigger(anim_id){
    const next = ANIM_MAP[anim_id]
    this['on_'+next]()
  }

  on_idle(){
    if(this.current_id == 'idle'){ return }
    this.current.crossFadeTo(this.actions.idle,0.5,false)
  }

  on_walk(){

  }

  on_hit(){

  }

  on_attack(){

  }

  on_die(){

  }

}