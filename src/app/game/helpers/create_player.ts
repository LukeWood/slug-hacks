import * as THREE from 'three';

export class Player {

  speed=1;

  constructor(name, threeObj){
    this.name = name;
    this.threeObj = threeObj,
    this.state = {
      velocity: 0,
      rotation: 0
    }
  }

  tick(dt, controls) {
    if(controlSet(controls, "up")) {
      this.state.velocity+=(dt/20)
    }
    if(controlSet(controls, "down")) {
      this.state.velocity+=(-dt/20)
    }

    this.threeObj.translateZ(this.state.velocity)

    if(controlSet(controls, "left")) {
      this.state.rotation+=dt;
    }
    if(controlSet(controls, "right")) {
      this.state.rotation-=dt;
    }
    this.threeObj.rotation.y = this.state.rotation;
  }
}


function controlSet(controls, control) {
  if(!controls.hasOwnProperty(control)) {
    return false;
  }
  return controls[control];
}
