import { Component, OnInit, ViewChild, Directive } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ReplaySubject, interval} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

import {TextureLoader,AxesHelper, LinearFilter, DirectionalLight,MeshPhongMaterial,BoxGeometry, GridHelper,  ShaderLib, ShaderMaterial, BackSide, BoxBufferGeometry, Mesh, Scene, PerspectiveCamera, Renderer, WebGLRenderer} from 'three';

import {createPlayer} from './helpers/create_player';
import {loadModel, loadMaterial} from './helpers/models';

import * as THREE from 'three';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
  name: string = 'Sammy the Slug';
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  light: DirectionalLight;
  bgMesh: Mesh;

  activePlayer: any;
  playerModel: any;

  allPlayers: any;

  @ViewChild('game') game;

  destroy$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.name = this.route.snapshot.paramMap.get("name") || 'Sammy the Slug';
    this.allPlayers = [];

    window.addEventListener("resize", this.resizeRendererToDisplaySize.bind(this))

    if ( !this.webglAvailable() ) {
      alert("No webgl support");
      return;
    }

  }

  ngAfterContentInit() {
    const fallback = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    loadMaterial('assets/models/slug/obj/cartoon_slug.mtl')
    .then((materials) => loadModel('assets/models/slug/obj/cartoon_slug.obj', materials))
    .catch(err => {
      console.error(err);
      return fallback;
    }).then(slugModel => {
            this.player = createPlayer(this.name, slugModel);
            this.camera = this.createCamera(this.player.threeObj);
            this.scene = this.createScene();
            this.scene.add(this.player.threeObj);
            this.camera.lookAt( this.scene.position );
            this.renderer = new WebGLRenderer({canvas: this.game.nativeElement, antialias: true});
            this.resizeRendererToDisplaySize();
            this.animate(0);
    })
  }

  createScene() {
    const scene = new Scene();
    scene.add(new GridHelper( 4, 10 ) );
    scene.add( new AxesHelper() );
    scene.add(this.createLight());
    var light = new THREE.AmbientLight( 0x404040 ); // soft white light
    scene.add( light );
    return scene;
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
    const far = 5;
    const camera = new PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 2, -2);
    this.player.threeObj.add(camera);
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

  updatePlayer() {

  }

  gameTick(t) {
    for(player of this.allPlayers) {
      player.tick();
    }
  }

  render(time) {
    time *= 0.001;
    this.gameTick(time);
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
}
