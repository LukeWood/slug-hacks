import { MTLLoader, OBJLoader } from "three-obj-mtl-loader";

export function loadModel(path, materials) {
  return new Promise((resolve, reject) => {
    materials.preload();
    var loader = new OBJLoader();
    // load a resource
    loader.load(
    	// resource URL
    	path,
    	// called when resource is loaded
    	function ( object ) {
        resolve(object);
    	},
    	// called when loading is in progresses
    	function ( xhr ) {

    		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

    	},
    	// called when loading has errors
    	function ( error ) {
    		reject(error);
    	}
    );
  })
}


export function loadMaterial(path) {
  return new Promise((resolve, reject) => {
    var loader = new MTLLoader();
    loader.load(path, (materials) => resolve(materials));
  })
}
