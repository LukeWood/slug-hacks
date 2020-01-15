import * as THREE from 'three';


export function createPlayer(name, mesh) {
  const player = createPlayerMesh(mesh);
  let playerState = {};
  return {
    tick: (dx) => tick(player, dx),
    threeObj: player
  }
}

function createPlayerMesh(mesh) {
  return mesh
}


function tick(dx, player) {

}
