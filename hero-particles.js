/**
 * HERO PARTICLE EFFECT — The Pickleball Pavilion
 *
 * Renders the hero photo as a grid of tiny coloured 3D cubes (Three.js
 * InstancedMesh). At page-load the image reads as a coherent whole; scrolling
 * drives the camera inward, breaking the perspective calibration and scattering
 * the particles progressively across the full page scroll range.
 *
 * Isolated module — remove this <script> tag to disable the effect entirely.
 * Does NOT touch app.js, the booking widget, or any scroll-reveal logic.
 */

// ─── Reduced-motion bail-out ───────────────────────────────────────────────
// If the user prefers reduced motion, skip everything and leave the regular
// .hero-bg-image visible at full opacity.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Nothing to do — the static hero image is already in the DOM.
  throw new Error('[hero-particles] prefers-reduced-motion: skipping effect.');
}

// ─── CDN imports ─────────────────────────────────────────────────────────────
// Primary: skypack (ESM). Fallback URLs kept as comments if skypack is blocked:
//   THREE  → https://unpkg.com/three@0.130.0/build/three.module.js
//   gsap   → https://unpkg.com/gsap@3.7.0/dist/gsap.min.js  (UMD, not ESM)
import * as THREE from 'https://cdn.skypack.dev/three@0.130.0?min';
import { gsap }   from 'https://cdn.skypack.dev/gsap@3.7.0?min';

// ─── Config ──────────────────────────────────────────────────────────────────
const IMG_URL          = 'images/hero-1.jpeg';
const FOCUS_CAM_Z      = 180; // calibrated distance — image reads as whole photo here
const DISPERSE_CAM_Z   = 15;  // fully-scrolled distance — close-up breaks calibration hard
const INSTANCE_SIZE    = 1;
const RAND_RANGE_Z     = 2 * FOCUS_CAM_Z * 0.99; // built around FOCUS_CAM_Z — do not change

// Mobile: reduce instance count to keep GPU happy on small viewports
const N_ROW = window.innerWidth < 700 ? 120 : 256;

// ─── Renderer / Scene / Camera ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 1000);
camera.position.set(0, 0, FOCUS_CAM_Z); // start at the coherent focal point

// ─── Helper: world-space position for a given target Z depth ─────────────────
function positionForDepth(x, y, targetZ) {
  const h = 0.5;
  const d = FOCUS_CAM_Z;
  const D = -targetZ + d;
  const H = (h / d) * D;
  const s = H / h;
  return { s, p: new THREE.Vector3(x * s, y * s, targetZ) };
}

// ─── Build instanced mesh ────────────────────────────────────────────────────
function buildMesh(imgRatio) {
  const nCol = (N_ROW * imgRatio) | 0;
  const sz   = INSTANCE_SIZE;

  const geom = new THREE.BoxGeometry(sz, sz, sz).translate(0, 0, -0.5 * sz);
  const mat  = new THREE.MeshBasicMaterial({ vertexColors: false });
  const mesh = new THREE.InstancedMesh(geom, mat, nCol * N_ROW);

  for (let i = 0, c = 0; i < N_ROW; ++i) {
    for (let j = 0; j < nCol; ++j) {
      const { p, s } = positionForDepth(
        (j - nCol / 2 + 0.5) * sz,
        (N_ROW / 2 - i + 0.5) * sz,
        THREE.MathUtils.randFloatSpread(RAND_RANGE_Z) * sz
      );
      const matrix = new THREE.Matrix4()
        .setPosition(p)
        .multiply(new THREE.Matrix4().makeScale(s, s, s));
      mesh.setMatrixAt(c, matrix);
      mesh.setColorAt(c, new THREE.Color('white'));
      ++c;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate  = true;
  return { mesh, nCol };
}

// ─── Load hero image, sample pixels, colour the instances ────────────────────
let meshRef = null;
let currentNCol = 0;

function applyCoverScale(mesh, nRow, nCol) {
  const vFovRad = camera.fov * (Math.PI / 180);
  const frustumHeight = 2 * FOCUS_CAM_Z * Math.tan(vFovRad / 2);
  const frustumWidth = frustumHeight * camera.aspect;

  const scaleToCoverHeight = frustumHeight / nRow;
  const scaleToCoverWidth = frustumWidth / nCol;
  const coverScale = Math.max(scaleToCoverHeight, scaleToCoverWidth);

  mesh.scale.set(coverScale, coverScale, 1);
}

function sizeOverlay() {
  const overlay = document.getElementById('particle-dark-overlay');
  const bookingSection = document.getElementById('booking');
  if (!overlay || !bookingSection) return;

  const height = bookingSection.getBoundingClientRect().top + window.scrollY;
  overlay.style.height = `${height}px`;
}

const img       = new Image();
img.crossOrigin = 'anonymous';

img.onload = () => {
  const imgRatio       = img.width / img.height;
  const { mesh, nCol } = buildMesh(imgRatio);
  scene.add(mesh);
  meshRef = mesh;
  currentNCol = nCol;

  applyCoverScale(mesh, N_ROW, nCol);
  sizeOverlay();

  // Downsample to a small canvas to sample pixel colours efficiently
  const can    = document.createElement('canvas');
  can.height   = N_ROW;
  can.width    = (can.height * imgRatio) | 0;
  const ctx    = can.getContext('2d');
  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, can.width, can.height);

  const { data } = ctx.getImageData(0, 0, can.width, can.height);
  const colour   = new THREE.Color();
  const total    = Math.min(data.length >> 2, N_ROW * nCol);

  for (let i = 0; i < total; ++i) {
    colour.setRGB(
      data[i * 4]     / 255,
      data[i * 4 + 1] / 255,
      data[i * 4 + 2] / 255
    );
    mesh.setColorAt(i, colour);
  }
  mesh.instanceColor.needsUpdate = true;

  // Hide the static hero <img> once particles are ready so they don't fight
  const heroBgImg = document.querySelector('.hero-bg-image');
  if (heroBgImg) {
    heroBgImg.style.transition = 'opacity 0.6s ease';
    heroBgImg.style.opacity    = '0';
  }
};

img.onerror = () => {
  // If the image fails to load (CORS, wrong path, etc.) leave the static hero intact
  console.warn('[hero-particles] Could not load hero image — falling back to static hero.');
  cleanup();
};

img.src = IMG_URL;

// ─── Render loop ──────────────────────────────────────────────────────────────
renderer.setAnimationLoop(() => renderer.render(scene, camera));

// ─── Resize handler ───────────────────────────────────────────────────────────
function resize() {
  const w   = window.innerWidth;
  const h   = window.innerHeight;
  const dpr = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  if (meshRef && currentNCol > 0) {
    applyCoverScale(meshRef, N_ROW, currentNCol);
  }
  sizeOverlay();
}

window.addEventListener('resize', resize, { passive: true });
resize();

// ─── Mount canvas ─────────────────────────────────────────────────────────────
const canvas    = renderer.domElement;
canvas.id       = 'hero-particle-canvas';
document.body.prepend(canvas);

// ─── Scroll-driven camera dolly (focus → disperse tracking the Booking section) ──

function getDisperseDistance() {
  const bookingSection = document.getElementById('booking');
  if (bookingSection) {
    return bookingSection.getBoundingClientRect().top + window.scrollY - (window.innerHeight * 0.15);
  }
  return document.documentElement.scrollHeight - window.innerHeight;
}

let disperseDistance = getDisperseDistance();
window.addEventListener('resize', () => {
  disperseDistance = getDisperseDistance();
}, { passive: true });

function onScroll() {
  const scrollY = window.scrollY;
  const r = disperseDistance > 0 ? Math.min(scrollY / disperseDistance, 1) : 0;

  // Drive camera from FOCUS_CAM_Z (whole image) → DISPERSE_CAM_Z (max scatter)
  const z = FOCUS_CAM_Z + (DISPERSE_CAM_Z - FOCUS_CAM_Z) * r;
  gsap.killTweensOf(camera.position);
  gsap.to(camera.position, { z, duration: 0.6, ease: 'power2.out' });
}

document.addEventListener('scroll', onScroll, { passive: true });
onScroll(); // run once on load to set initial camera position

// ─── Cleanup helper (used if image fails to load) ─────────────────────────────
function cleanup() {
  renderer.setAnimationLoop(null);
  document.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', resize);
  if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  const heroBgImg = document.querySelector('.hero-bg-image');
  if (heroBgImg) heroBgImg.style.opacity = '1';
}
