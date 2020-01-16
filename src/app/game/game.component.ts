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

import * as firebase from 'firebase/app'
// Required for side-effects
import "firebase/firestore";

// If you enabled Analytics in your project, add the Firebase SDK for Analytics
import "firebase/analytics";

// Add the Firebase products that you want to use
import "firebase/auth";
import "firebase/firestore";

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
  db: any;

  slugModel: Object;

  player: Player;
  allPlayers: any;
  controlState: Object;
  clock: THREE.Clock;

  ground_material: any;
  ground: any;

  uid: any;

  slugs: any;

  @ViewChild('game', {static: false}) game;

  destroy$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
  constructor(private route: ActivatedRoute, private _router: Router) {}

  ngOnInit() {
    this.name = this.route.snapshot.paramMap.get("name") || 'Sammy the Slug';
    this.allPlayers = {};
    this.controlState = {};
    // Your web app's Firebase configuration
    var firebaseConfig = {
      apiKey: "AIzaSyDqL9qzmLFYCVP4-DxUFs0F1aRMN_ii3QA",
      authDomain: "slug-hacks.firebaseapp.com",
      databaseURL: "https://slug-hacks.firebaseio.com",
      projectId: "slug-hacks",
      storageBucket: "slug-hacks.appspot.com",
      messagingSenderId: "887692061133",
      appId: "1:887692061133:web:3a477abe7d6e495bb7bc84",
      measurementId: "G-4C2K1Q4PJ2"
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    firebase.analytics();
    this.db = firebase.firestore();
    this.slugs = this.db.collection('slugs');

    window.addEventListener("resize", this.resizeRendererToDisplaySize.bind(this))

    if ( !this.webglAvailable() ) {
      alert("No webgl support");
      return;
    }
  }

  ngAfterContentInit() {
    this.initGame();
  }

  getUid() {
    return new Promise((resolve, reject) => {
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          // User is signed in.
          var isAnonymous = user.isAnonymous;
          var uid = user.uid;
          resolve(uid);
          // ...
        } else {
          // User is signed out.
          // ...
        }
        // ...
      });
      firebase.auth().signInAnonymously().catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        alert(errorMessage);
        // ...
      });
    })

  }

  initGame() {
    const fallback = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    this.getUid()
    .then(uid => this.uid = uid)
    .then(() => loadMaterial('assets/models/slug/obj/cartoon_slug.mtl'))
    .then((materials) => loadModel('assets/models/slug/obj/cartoon_slug.obj', materials, (mats) => {
      mats.materials.slug_eye_blue.color.setHex(0x20B2AA)
      mats.materials.slug_skin.color.setHex(0xffe135)
      return mats;
    }))
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
    this.player = new Player(this.name, this.uid, this.slugModel, this.db, true);
    this.camera = this.createCamera(this.player.physics_sphere);
    this.scene = this.createScene();
    this.scene.add(this.player.physics_sphere);
    this.scene.add(this.player.model);
    this.camera.lookAt( this.scene.position );

    this.slugs.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const id = change.doc.id;
          if(id == this.uid) {
            return;
          }

          const data = change.doc.data();

          if (change.type === "added") {
            this.allPlayers[id] = new Player(this.name, id, this.slugModel, this.db, false);
            this.scene.add(this.allPlayers[id].physics_sphere);
            this.scene.add(this.allPlayers[id].model);
          }
          if (change.type === "modified") {
            this.allPlayers[id].deserialize_state(data);
          }
          if (change.type === "removed") {
            this.scene.remove(this.allPlayers[id].physics_sphere);
            this.scene.remove(this.allPlayers[id].model);
            delete this.allPlayers[id]
          }
        })
      },
      e => {
        console.error(e);
      }
    )

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
    let bgMesh;
    {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(
        'assets/img/lakeside_2k.jpg',
      );
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;

      const shader = THREE.ShaderLib.equirect;
      const material = new THREE.ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide,
      });
      material.uniforms.tEquirect.value = texture;
      const plane = new THREE.BoxBufferGeometry(WORLD_DIMS.width*2, WORLD_DIMS.height*1.2, WORLD_DIMS.height*2);
      bgMesh = new THREE.Mesh(plane, material);
      scene.add(bgMesh);
    }
    return scene;
  }

  createWorld() {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      'assets/img/lakeside_2k.jpg',
    );
    this.ground_material = Physijs.createMaterial(
        new THREE.MeshStandardMaterial( { color: 0x964B00 } ), 0.9, 1 // low restitution
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
    this.player.tick(elapsed);

    for(let key of Object.keys(this.allPlayers)) {
      this.allPlayers[key].tick(elapsed);
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
        this.player.controlState[keyMapping[key]] = true;
        this.player.serialize_to_db();
      }
    })

    window.addEventListener('keyup', evt => {
      const key = evt.key.toLowerCase();
      if(keyMapping.hasOwnProperty(key)) {
        this.player.controlState[keyMapping[key]] = false;
        this.player.serialize_to_db();
      }
    })
  }

  checkDead() {
    const pos = this.player.physics_sphere.position;
    if(pos.y < -WORLD_DIMS.height*1.2/2) {
      this.lost();
    }
  }

  shownYet = false;
  lost() {
    if(!this.shownYet) {
      this.player.delete()
        .then(() => {
          window.location.replace('/')
        })
    }
  }

  isMobile() {
    return ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
  }
}
