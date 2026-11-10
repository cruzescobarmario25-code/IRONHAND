import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const container = document.getElementById('arm-view');

if (!container) {
  console.error('[IRONHAND] No existe #arm-view');
} else {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080d18);

  const camera = new THREE.PerspectiveCamera(
    40,
    1,
    0.1,
    100
  );

  camera.position.set(5, 4, 7);
  camera.lookAt(0, 1.5, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  container.replaceChildren(renderer.domElement);

  const material = new THREE.MeshStandardMaterial({
    color: 0xb51f2b,
    metalness: 0.8,
    roughness: 0.25
  });

  const gold = new THREE.MeshStandardMaterial({
    color: 0xe9b83f,
    metalness: 0.85,
    roughness: 0.2
  });

  const dark = new THREE.MeshStandardMaterial({
    color: 0x26364d,
    metalness: 0.8,
    roughness: 0.3
  });

  scene.add(new THREE.HemisphereLight(0xbad7ff, 0x151525, 2));

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(4, 8, 5);
  light.castShadow = true;
  scene.add(light);

  const floor = new THREE.GridHelper(10, 20, 0x1676c5, 0x26364d);
  floor.position.y = -0.05;
  scene.add(floor);

  function cylinderBetween(a, b, radius, mat, segments = 32) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const direction = new THREE.Vector3().subVectors(end, start);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), segments),
      mat
    );

    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function joint(position, radius = 0.2) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 24),
      gold
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  }

  // Hombro
  joint([0, 3.5, 0], 0.32);

  // Brazo superior
  cylinderBetween([0, 3.5, 0], [0, 2.4, 0], 0.24, material);
  cylinderBetween([0, 3.5, 0], [0, 2.4, 0], 0.12, dark);

  // Codo
  joint([0, 2.4, 0], 0.27);

  // Antebrazo
  cylinderBetween([0, 2.4, 0], [0, 0.9, 0], 0.19, material);
  cylinderBetween([0, 2.4, 0], [0, 0.9, 0], 0.09, dark);

  // Muñeca
  joint([0, 0.9, 0], 0.17);

  // Palma
  const palm = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.85, 0.3),
    material
  );
  palm.position.set(0, 0.35, 0);
  palm.castShadow = true;
  scene.add(palm);

  // Dedos articulados
  const fingers = [];

  const fingerPositions = [
    [-0.3, -0.1, 0],
    [-0.1, -0.1, 0],
    [0.1, -0.1, 0],
    [0.3, -0.1, 0]
  ];

  for (const [x, y, z] of fingerPositions) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0, z);
    palm.add(pivot);

    const first = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.075, 0.35, 16),
      gold
    );
    first.position.set(0, -0.22, 0);
    pivot.add(first);

    const secondPivot = new THREE.Group();
    secondPivot.position.set(0, -0.4, 0);
    pivot.add(secondPivot);

    const second = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.28, 16),
      material
    );
    second.position.set(0, -0.14, 0);
    secondPivot.add(second);

    fingers.push({ pivot, secondPivot });
  }

  // Pulgar
  const thumb = new THREE.Group();
  thumb.position.set(-0.43, 0.1, 0);
  thumb.rotation.z = -0.7;
  palm.add(thumb);

  const thumbPart = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 0.4, 16),
    gold
  );
  thumbPart.position.y = -0.2;
  thumb.add(thumbPart);

  // Controles de movimiento
  let grip = 0;

  function setGrip(value) {
    grip = THREE.MathUtils.clamp(Number(value), 0, 1);

    for (const finger of fingers) {
      finger.pivot.rotation.z = grip * 0.85;
      finger.secondPivot.rotation.z = grip * 0.9;
    }

    thumb.rotation.z = -0.7 + grip * 0.7;
  }

  const gripControl = document.getElementById('arm-grip');

  if (gripControl) {
    gripControl.addEventListener('input', e => {
      setGrip(e.target.value);
    });
  }

  // Arrastre táctil y ratón para rotar la prótesis
  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  let rotationY = 0;
  let rotationX = 0;

  renderer.domElement.style.touchAction = 'none';

  renderer.domElement.addEventListener('pointerdown', e => {
    dragging = true;
    previousX = e.clientX;
    previousY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  });

  renderer.domElement.addEventListener('pointermove', e => {
    if (!dragging) return;

    rotationY += (e.clientX - previousX) * 0.01;
    rotationX += (e.clientY - previousY) * 0.01;

    rotationX = THREE.MathUtils.clamp(rotationX, -1.2, 1.2);

    previousX = e.clientX;
    previousY = e.clientY;
  });

  renderer.domElement.addEventListener('pointerup', () => {
    dragging = false;
  });

  renderer.domElement.addEventListener('pointercancel', () => {
    dragging = false;
  });

  // Ajuste automático de pantalla
  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function animate() {
    requestAnimationFrame(animate);

    scene.rotation.y = rotationY;
    scene.rotation.x = rotationX;

    renderer.render(scene, camera);
  }

  animate();

  window.setGrip = setGrip;

  console.log('[IRONHAND] Brazo 3D inicializado correctamente');
}
