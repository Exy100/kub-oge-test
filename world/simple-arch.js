import * as THREE from '../vendor/three.module.js';

export function createSimpleArchEffect() {
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 256;
  const ctx = tile.getContext('2d');
  ctx.fillStyle = '#091d43';
  ctx.fillRect(0, 0, tile.width, tile.height);
  ctx.fillStyle = '#80cfff';
  ctx.shadowColor = '#397cff';
  ctx.shadowBlur = 5;
  for (const tip of [56, 119]) {
    ctx.beginPath();
    ctx.moveTo(10, tip + 36);
    ctx.lineTo(64, tip);
    ctx.lineTo(118, tip + 36);
    ctx.lineTo(118, tip + 55);
    ctx.lineTo(64, tip + 19);
    ctx.lineTo(10, tip + 55);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(tile);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const opening = new THREE.PlaneGeometry(1.04, 2.02);

  return {
    createSurface({ x, z }) {
      const surface = new THREE.Mesh(opening, material);
      surface.position.set(x, 1.05, z);
      surface.visible = false;
      return surface;
    },
    update(timeMs, reducedMotion) {
      texture.offset.y = reducedMotion ? 0 : -(timeMs % 3000) / 3000;
    },
  };
}
