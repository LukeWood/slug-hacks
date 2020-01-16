import * as THREE from 'three';
import Physijs from 'physijs-webpack';

const SHARED_FIELDS = [
 "position",  "_physijs"
]

const xmax = 45;
const zmax = 45;

const weight = 15;
const force = 8;
const slug_radius = 1.7;

export class Player {

  name: any;
  uid: any;
  model: any;
  physics_sphere: any;
  lastUpdated = 0;
  db: any;
  mainCharacter: any;
  deleted = false;

  controlState = {
    up: false,
    left: false,
    right: false,
    down: false
  }

  constructor(name, uid, model, db, mainCharacter){
    this.mainCharacter = mainCharacter;
    var ball_material = Physijs.createMaterial(new THREE.MeshPhongMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.75,
    wireframe: true
    }),0.9, 0.05);
    var ball_geometry = new THREE.SphereGeometry(slug_radius,16, 16);
    this.physics_sphere = new Physijs.SphereMesh(ball_geometry,ball_material,weight);
    this.physics_sphere.slug = true;
    this.physics_sphere.position.set(
      Math.random()*xmax - xmax/2,
      25,
      Math.random()*zmax - zmax/2
    );
    this.physics_sphere.addEventListener( 'collision', ( other_object, relative_velocity, relative_rotation, contact_normal ) => {
      if(other_object.slug && this.mainCharacter) {
        this.physics_sphere.applyImpulse(new THREE.Vector3((0.5 -Math.random())*2500, Math.random()*5000,(0.5 -Math.random())*2500), new THREE.Vector3(1, 1, 1))
        this.serialize_to_db();
      }
    // `this` has collided with `other_object` with an impact speed of `relative_velocity` and a rotational force of `relative_rotation` and at normal `contact_normal`
    });
    this.physics_sphere.setLinearVelocity(new THREE.Vector3(0, 0, 0))

    this.model = model.clone();
    this.model.scale.set(slug_radius/0.33,slug_radius/0.33, slug_radius/0.33)
    this.model.castShadows = true;
    this.name = name;
    this.uid = uid;
    this.db = db;
    window.onbeforeunload = function(){
      this.delete();
    };
  }

  tick(dt) {
    if(this.controlSet("up")) {
      this.up();
    }
    if(this.controlSet("down")) {
      this.down();
    }
    if(this.controlSet("left")) {
      this.left();
    }
    if(this.controlSet("right")) {
      this.right();
    }


    this.model.position.copy(this.physics_sphere.position);
    this.model.position.add(new THREE.Vector3(0, -slug_radius, 0))
    const linearVel = (this.physics_sphere._physijs.linearVelocity);
    if(linearVel) {
      this.model.lookAt(this.model.position.clone().add(linearVel))
    }
  }

  serialize_to_db() {
    if(!this.deleted) {
      this.db.collection('slugs').doc(this.uid).set(
        this.serialize_state()
      ).catch(e => console.error(e))
    }
  }

  serialize_state() {
    const result = {};
    result['position'] = JSON.parse(JSON.stringify(this.physics_sphere['position']));
    result['controlState'] = JSON.parse(JSON.stringify(this.controlState));
    result['linearVelocity'] = JSON.parse(JSON.stringify(this.physics_sphere.getLinearVelocity()));
    return result;
  }

  deserialize_state(nstate) {
    console.log("DESERIAL")
    this.physics_sphere.position.set(nstate['position'].x, nstate['position'].y, nstate['position'].z)
    this.physics_sphere.__dirtyPosition = true;
    const linobj = nstate['linearVelocity'];
    const newVel = new THREE.Vector3(linobj.x, linobj.y, linobj.z);
    this.physics_sphere.setLinearVelocity(newVel);

    this.controlState = nstate.controlState;
  }

  delete() {
    this.deleted = true;
    return this.db.collection('slugs').doc(this.uid).delete()
      .then(() => console.log("deleted data"));
  }

  up() {
    this.physics_sphere.applyImpulse(new THREE.Vector3(0, 0, force), new THREE.Vector3(1, 1, 1))
  }

  down() {
    this.physics_sphere.applyImpulse(new THREE.Vector3(0, 0, -force), new THREE.Vector3(1, 1, 1))
  }

  left() {
    this.physics_sphere.applyImpulse(new THREE.Vector3(force, 0, 0), new THREE.Vector3(1, 1, 1))
  }

  right() {
    this.physics_sphere.applyImpulse(new THREE.Vector3(-force, 0, 0), new THREE.Vector3(1, 1, 1))
  }
  controlSet(control) {
    if(!this.controlState.hasOwnProperty(control)) {
      return false;
    }
    return this.controlState[control];
  }
}
