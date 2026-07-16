/**
 * HERO PARTICLE EFFECT — The Pickleball Pavilion
 *
 * Renders the hero photo as a grid of tiny coloured 3D cubes (Three.js
 * InstancedMesh). At page load the image reads as a coherent whole; scrolling
 * drives the camera inward, breaking perspective calibration and scattering
 * the particles across the full page scroll range.
 *
 * Isolated module — remove this <script> tag to disable the effect entirely.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.130.0/+esm';
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.7.0/+esm';

// ─── Reduced-motion bail-out ───────────────────────────────────────────────
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

const imgUrl = 'images/hero-1.jpeg';
const imgRatio = 1920 / 1080;
const focusCameraZ = 180;
const disperseCameraZ = 15;
const instanceSize = 1;
const randRangeZ = 2 * focusCameraZ * 0.99;
const nRow = 256;
const nCol = (nRow * imgRatio) | 0;

// ─── Renderer / Scene / Camera ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ alpha: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 2, 0.5, 1000);
camera.position.set(0, 0, focusCameraZ);

function positionForDepth(x, y, targetZ) {
  const h = 0.5;
  const d = focusCameraZ;
  const D = -targetZ + d;
  const H = (h / d) * D;
  const s = H / h;
  return { s, p: new THREE.Vector3(x * s, y * s, targetZ) };
}

// ─── Build mesh immediately (white cubes, coloured on image load) ───────────
const mesh = (() => {
  const sz = instanceSize;

  const geom = new THREE.BoxGeometry(sz, sz, sz).translate(0, 0, -0.5 * sz);
  const mat = new THREE.MeshBasicMaterial();
  const instancedMesh = new THREE.InstancedMesh(geom, mat, nCol * nRow);

  for (let i = 0, c = 0; i < nRow; ++i) {
    for (let j = 0; j < nCol; ++j) {
      const { p, s } = positionForDepth(
        (j - nCol / 2 + 0.5) * sz,
        (nRow / 2 - i + 0.5) * sz,
        THREE.MathUtils.randFloatSpread(randRangeZ) * sz
      );
      const m = new THREE.Matrix4()
        .setPosition(p)
        .multiply(new THREE.Matrix4().makeScale(s, s, s));
      instancedMesh.setMatrixAt(c, m);
      instancedMesh.setColorAt(c, new THREE.Color('white'));
      ++c;
    }
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  instancedMesh.instanceColor.needsUpdate = true;
  return instancedMesh;
})();
scene.add(mesh);

function applyCoverScale() {
  const vFovRad = camera.fov * (Math.PI / 180);
  const frustumHeight = 2 * focusCameraZ * Math.tan(vFovRad / 2);
  const frustumWidth = frustumHeight * camera.aspect;

  const scaleToCoverHeight = frustumHeight / nRow;
  const scaleToCoverWidth = frustumWidth / nCol;
  const coverScale = Math.max(scaleToCoverHeight, scaleToCoverWidth);

  mesh.scale.set(coverScale, coverScale, 1);
}

// ─── Load hero image, sample pixels, colour the instances ────────────────────
const img = new Image();
img.onload = () => {
  const { width, height } = img;
  const can = document.createElement('canvas');
  can.height = nRow;
  can.width = (can.height * imgRatio) | 0;
  const ctx = can.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height, 0, 0, can.width, can.height);
  const { data } = ctx.getImageData(0, 0, can.width, can.height);
  const c = new THREE.Color();
  const total = data.length >> 2;
  for (let i = 0; i < total; ++i) {
    mesh.setColorAt(i, c.setRGB(data[i * 4] / 255, data[i * 4 + 1] / 255, data[i * 4 + 2] / 255));
  }
  mesh.instanceColor.needsUpdate = true;
  applyCoverScale();

  const heroBgImg = document.querySelector('.hero-bg-image');
  if (heroBgImg) {
    heroBgImg.style.transition = 'opacity 0.6s ease';
    heroBgImg.style.opacity = '0';
  }
};

img.onerror = () => {
  console.warn('[hero-particles] Could not load hero image — falling back to static hero.');
  cleanup();
};

img.crossOrigin = '';
img.src = imgUrl;

// ─── Render loop ──────────────────────────────────────────────────────────────
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

// ─── Resize handler ───────────────────────────────────────────────────────────
function resize(w, h, dpr = devicePixelRatio) {
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  applyCoverScale();
}

function onResize() {
  resize(innerWidth, innerHeight);
}

addEventListener('resize', onResize, { passive: true });
dispatchEvent(new Event('resize'));

// ─── Mount canvas ─────────────────────────────────────────────────────────────
const canvas = renderer.domElement;
canvas.id = 'hero-particle-canvas';
document.body.prepend(canvas);

// ─── Scroll-driven camera dolly (focus → disperse across full page) ───────────
function setCamPos() {
  const H = document.documentElement.offsetHeight - window.innerHeight;
  const r = H > 0 ? window.scrollY / H : 0;
  const z = focusCameraZ + (disperseCameraZ - focusCameraZ) * r;
  gsap.killTweensOf(camera.position);
  gsap.to(camera.position, { z });
}

document.addEventListener('scroll', setCamPos, { passive: true });
setCamPos();

// ─── Cleanup helper (used if image fails to load) ─────────────────────────────
function cleanup() {
  renderer.setAnimationLoop(null);
  document.removeEventListener('scroll', setCamPos);
  removeEventListener('resize', onResize);
  if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  const heroBgImg = document.querySelector('.hero-bg-image');
  if (heroBgImg) heroBgImg.style.opacity = '1';
}

} // end reduced-motion guard
