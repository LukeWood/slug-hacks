import * as THREE from 'three';
import Physijs from 'physijs-webpack';

export class Player {

  name: any;
  model: any;
  physics_sphere: any;
  state: any;

  constructor(name, model){
    var ball_material = Physijs.createMaterial(new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true
}),0.8, 0.1);
    var ball_geometry = new THREE.SphereGeometry(0.2,16,16);

    this.physics_sphere = new Physijs.SphereMesh(ball_geometry,ball_material,15);
    this.physics_sphere.setLinearVelocity(new THREE.Vector3(0, 0, 0))
    this.physics_sphere.position.y = 25;

    this.model = model.clone();

    this.name = name;
    this.state = {
      velocity: 0,
      rotation: 0
    }
  }

  tick(dt, controls) {
    if(controlSet(controls, "up")) {
      this.up();
    }
    if(controlSet(controls, "down")) {
      this.down();
    }

    if(controlSet(controls, "left")) {
      this.left();
    }
    if(controlSet(controls, "right")) {
      this.right();
    }
    this.model.position.copy(this.physics_sphere.position);
    const linearVel = (this.physics_sphere._physijs.linearVelocity);

    if(linearVel) {
      this.model.lookAt(this.model.position.clone().add(linearVel))
    }
  }

  up() {
    this.physics_sphere.applyImpulse(new THREE.Vector3(0, 0, 2.5), new THREE.Vector3(1, 1, 1))
  }

  down() {
    this.physics_sphere.applyImpulse(new THREE.Vector3(0, 0, -2.5), new THREE.Vector3(1, 1, 1))
  }

  left() {
    this.physics_sphere.applyImpulse(new THREE.Vector3(2.5, 0, 0), new THREE.Vector3(1, 1, 1))
  }

  right() {
    this.physics_sphere.applyImpulse(new THREE.Vector3(-2.5, 0, 0), new THREE.Vector3(1, 1, 1))
  }
}

function controlSet(controls, control) {
  if(!controls.hasOwnProperty(control)) {
    return false;
  }
  return controls[control];
}
