import { Component, OnInit, ViewChild, Directive } from '@angular/core';
import {Router} from '@angular/router';
import {ActivatedRoute} from '@angular/router';
import {ReplaySubject, interval} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

import {TextureLoader,AxesHelper, LinearFilter, DirectionalLight,MeshPhongMaterial,BoxGeometry, GridHelper,  ShaderLib, ShaderMaterial, BackSide, BoxBufferGeometry, Mesh, Scene, PerspectiveCamera, Renderer, WebGLRenderer} from 'three';
import * as THREE  from 'three';

import {Player} from './helpers/create_player';
import {loadModel, loadMaterial} from './helpers/models';

import Physijs from 'physijs-webpack';

const WORLD_DIMS = {
  width: 50,
  height: 50
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
  name: string = 'Sammy the Slug';
  scene: Physijs.Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  light: DirectionalLight;
  bgMesh: Mesh;

  activePlayer: any;
  playerModel: any;

  slugModel: Object;

  player: Player;
  allPlayers: any;
  controlState: Object;
  clock: THREE.Clock;

  ground_material: any;
  ground: any;

  @ViewChild('game', {static: false}) game;

  destroy$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
  constructor(private route: ActivatedRoute, private _router: Router) {}

  ngOnInit() {
    this.name = this.route.snapshot.paramMap.get("name") || 'Sammy the Slug';
    this.allPlayers = [];
    this.controlState = {};

    window.addEventListener("resize", this.resizeRendererToDisplaySize.bind(this))

    if ( !this.webglAvailable() ) {
      alert("No webgl support");
      return;
    }
  }

  ngAfterContentInit() {
    this.initGame();
  }

  initGame() {
    const fallback = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    loadMaterial('assets/models/slug/obj/cartoon_slug.mtl')
    .then((materials) => loadModel('assets/models/slug/obj/cartoon_slug.obj', materials))
    .catch(err => {
      console.error(err);
      return fallback;
    })
    .then(loaded => this.initEntities(loaded))
    .then(() => {
      this.resizeRendererToDisplaySize();
      this.listenToKeyboard();
      this.animate(0);
    })
  }

  initEntities(slugModel) {
    this.slugModel = slugModel;
    this.player = new Player(this.name, slugModel);
    this.camera = this.createCamera(this.player.physics_sphere);
    this.scene = this.createScene();
    this.scene.add(this.player.physics_sphere);
    this.scene.add(this.player.model);
    this.camera.lookAt( this.scene.position );

    this.createWorld();
    this.renderer = new WebGLRenderer({canvas: this.game.nativeElement, antialias: true});
    return new Promise(resolve => resolve());
  }

  createScene() {
    const scene = new Physijs.Scene();
    scene.setGravity(new THREE.Vector3( 0, -30, 0 ));
    scene.add(new GridHelper( WORLD_DIMS.width, WORLD_DIMS.height ) );
    scene.add( new AxesHelper() );
    scene.add(this.createLight());
    var light = new THREE.AmbientLight( 0x404040 ); // soft white light
    scene.add( light );
    return scene;
  }

  createWorld() {
    this.ground_material = Physijs.createMaterial(
        new THREE.MeshStandardMaterial( { color: 0x00ff00 } ), 0.9, .2 // low restitution
    );
      // Ground
      this.ground = new Physijs.BoxMesh(
        new THREE.BoxGeometry(WORLD_DIMS.width, 1, WORLD_DIMS.height),
        this.ground_material,0 // mass
        // restitution
      );
      this.ground.position.set(0, -0.51, 0);
      this.ground.receiveShadow = true;
      this.scene.add(this.ground);
  }

  createLight() {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    return light
  }

  createCamera(player) {
    const fov = 75;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 100;
    const camera = new PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 2, -4);
    return camera;
  }

  webglAvailable() {
    try {
      return !!( window.WebGLRenderingContext && (
        document.createElement( 'canvas' ).getContext( 'webgl' ) ||
        document.createElement( 'canvas' ).getContext( 'experimental-webgl' ) )
      );
    } catch ( e ) {
      return false;
    }
  }

  prev = 0;
  gameTick(t) {
    const elapsed = t-this.prev;
    this.player.tick(elapsed, this.controlState);

    for(let player of this.allPlayers) {
      player.tick(elapsed);
    }

    this.prev = t;
    this.checkDead();
  }

  render(time) {
    time *= 0.001;
    this.gameTick(time);
    this.scene.simulate(); // run physics
    this.camera.position.copy(this.player.model.position);
    this.camera.position.add(new THREE.Vector3(0, 2, -4));
    this.renderer.render( this.scene, this.camera );
  }

  animate(time) {
    this.render(time);
    requestAnimationFrame( this.animate.bind(this) );
  }

  resizeRendererToDisplaySize() {
    const canvas = this.game.nativeElement;
    this.renderer.setSize(canvas.clientWidth,  canvas.clientHeight, false);
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera.updateProjectionMatrix();
  }

  listenToKeyboard() {
    const keyMapping = {
      "arrowup": "up",
      "w": "up",
      "arrowleft": "left",
      "a": "left",
      "arrowdown": "down",
      "s": "down",
      "arrowright": "right",
      "d": "right",
    }
    window.addEventListener('keydown', (evt) => {
      const key = evt.key.toLowerCase();
      if(keyMapping.hasOwnProperty(key)) {
        this.controlState[keyMapping[key]] = true;
      }
    })

    window.addEventListener('keyup', evt => {
      const key = evt.key.toLowerCase();
      if(keyMapping.hasOwnProperty(key)) {
        this.controlState[keyMapping[key]] = false;
      }
    })
  }

  checkDead() {
    const pos = this.player.physics_sphere.position;
    if(pos.y < -5) {
      this.lost();
    }
  }

  shownYet = false;
  lost() {
    if(!this.shownYet) {
      this.shownYet = true;
      alert("Your slug fell to a peaceful life in the woods below");
      window.location.reload()
    }
  }
}
