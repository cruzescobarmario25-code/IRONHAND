const statusNode = document.getElementById("arm-status");
const setStatus = (message, error = false) => {
  if (!statusNode || statusNode.textContent === message) return;
  statusNode.textContent = message;
  statusNode.style.color = error ? "#ff7b86" : "#65ffad";
};

// Estado público: lo lee la pantalla SYSTEM DIAGNOSTICS.
const STATUS = window.IRONHAND_STATUS = { renderer: "CHECKING", source: "-", detail: "" };
function fail(message, error) {
  if (error) console.error("[IRONHAND]", message, error);
  STATUS.renderer = "ERROR";
  STATUS.detail = message;
  setStatus("ERROR: " + message, true);
  window.dispatchEvent(new CustomEvent("ironhand:arm-error", { detail: message }));
}

const lastText = {};
function put(id, text) {
  if (lastText[id] === text) return;
  lastText[id] = text;
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function startIronhandArm() {
  const container = document.getElementById("arm-view");
  if (!container) {
    fail("NO SE ENCONTRÓ #arm-view");
    return;
  }

  // 1) copia local (funciona sin internet)  2) CDN como respaldo
  let THREE, source = "LOCAL";
  try {
    THREE = await import("../vendor/three.module.js");
  } catch (localError) {
    try {
      source = "CDN";
      THREE = await import("https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js");
    } catch (error) {
      fail("NO SE PUDO CARGAR THREE.JS (SIN COPIA LOCAL NI INTERNET)", error);
      return;
    }
  }

  try {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080f);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(4.7, 2.5, 7.5);
    camera.lookAt(0, 1.35, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = "none";
    container.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xc8e2ff, 0x172033, 2.0));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x1676c5, 22, 12);
    rimLight.position.set(-3, 2.5, -2);
    scene.add(rimLight);

    const redMetal = new THREE.MeshStandardMaterial({
      color: 0xb51f2b, metalness: 0.78, roughness: 0.27
    });
    const blueMetal = new THREE.MeshStandardMaterial({
      color: 0x1676c5, metalness: 0.82, roughness: 0.24
    });
    const goldMetal = new THREE.MeshStandardMaterial({
      color: 0xe9b83f, metalness: 0.85, roughness: 0.2
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x25364b, metalness: 0.8, roughness: 0.32
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x101722, metalness: 0.15, roughness: 0.75
    });

    const root = new THREE.Group();
    scene.add(root);

    function addMesh(parent, geometry, material, position, cast = true) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function link(parent, length, radiusTop, radiusBottom, material) {
      const group = new THREE.Group();
      parent.add(group);
      const body = addMesh(
        group,
        new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 32),
        material,
        [0, -length / 2, 0]
      );
      const band = addMesh(
        group,
        new THREE.CylinderGeometry(radiusTop * 1.18, radiusBottom * 1.18, 0.12, 32),
        goldMetal,
        [0, -length * 0.72, 0]
      );
      return group;
    }

    function joint(parent, radius = 0.19) {
      const pivot = new THREE.Group();
      parent.add(pivot);
      addMesh(pivot, new THREE.SphereGeometry(radius, 28, 20), goldMetal, [0, 0, 0]);
      addMesh(pivot, new THREE.TorusGeometry(radius * 1.08, 0.035, 8, 32), darkMetal, [0, 0, 0]);
      return pivot;
    }

    // Base and shoulder mount.
    addMesh(root, new THREE.CylinderGeometry(0.43, 0.52, 0.28, 32), darkMetal, [0, 3.35, 0]);
    const shoulder = joint(root, 0.27);
    shoulder.position.set(0, 3.18, 0);
    addMesh(shoulder, new THREE.SphereGeometry(0.34, 28, 20), redMetal, [0, 0, 0]);

    // Upper arm and elbow.
    const upper = link(shoulder, 1.35, 0.19, 0.25, redMetal);
    addMesh(upper, new THREE.BoxGeometry(0.22, 0.88, 0.22), darkMetal, [0, -0.68, 0]);
    const elbow = joint(shoulder, 0.22);
    elbow.position.y = -1.35;
    addMesh(elbow, new THREE.CylinderGeometry(0.27, 0.27, 0.18, 32), blueMetal, [0, 0, 0]);

    // Forearm.
    const forearm = link(elbow, 1.48, 0.13, 0.22, blueMetal);
    addMesh(forearm, new THREE.BoxGeometry(0.28, 0.95, 0.24), darkMetal, [0, -0.75, 0]);
    addMesh(forearm, new THREE.BoxGeometry(0.30, 0.45, 0.255), redMetal, [0, -0.52, 0.02]);

    // Wrist and palm.
    const wrist = joint(elbow, 0.15);
    wrist.position.y = -1.48;
    const palm = new THREE.Group();
    palm.position.y = -0.23;
    wrist.add(palm);
    addMesh(palm, new THREE.BoxGeometry(0.78, 0.78, 0.25), redMetal, [0, -0.18, 0]);
    addMesh(palm, new THREE.BoxGeometry(0.62, 0.54, 0.28), darkMetal, [0, -0.18, 0.015]);
    addMesh(palm, new THREE.BoxGeometry(0.18, 0.12, 0.31), goldMetal, [0, -0.48, 0.01]);

    // Four articulated fingers with two flexion joints each.
    const fingerPivots = [];
    const fingerXs = [-0.27, -0.09, 0.09, 0.27];
    const fingerLengths = [0.48, 0.58, 0.55, 0.43];

    fingerXs.forEach((x, i) => {
      const base = new THREE.Group();
      base.position.set(x, -0.52, 0);
      palm.add(base);
      const l1 = fingerLengths[i] * 0.58;
      const l2 = fingerLengths[i] * 0.42;
      addMesh(base, new THREE.CapsuleGeometry(0.065, Math.max(0.08, l1 - 0.13), 5, 12),
        blueMetal, [0, -l1 / 2, 0.015]);
      const tip = new THREE.Group();
      tip.position.y = -l1;
      base.add(tip);
      addMesh(tip, new THREE.SphereGeometry(0.075, 16, 12), goldMetal, [0, 0, 0]);
      addMesh(tip, new THREE.CapsuleGeometry(0.052, Math.max(0.06, l2 - 0.1), 5, 12),
        redMetal, [0, -l2 / 2, 0]);
      fingerPivots.push({ base, tip });
    });

    // Opposing thumb.
    const thumbBase = new THREE.Group();
    thumbBase.position.set(-0.38, -0.17, 0.02);
    thumbBase.rotation.z = -0.82;
    palm.add(thumbBase);
    addMesh(thumbBase, new THREE.CapsuleGeometry(0.075, 0.29, 5, 12),
      goldMetal, [0, -0.20, 0]);
    const thumbTip = new THREE.Group();
    thumbTip.position.set(0, -0.39, 0);
    thumbBase.add(thumbTip);
    addMesh(thumbTip, new THREE.CapsuleGeometry(0.06, 0.20, 5, 12),
      blueMetal, [0, -0.13, 0]);

    // Subtle technical floor and reference grid.
    const grid = new THREE.GridHelper(8, 24, 0x1676c5, 0x26364b);
    grid.position.y = -0.02;
    scene.add(grid);

    // ---- Estado de la mano ----
    // Cada modo define cuánto flexiona cada dedo (índice, medio, anular, meñique) y el pulgar.
    const MODES = {
      fist:     { name: "PUÑO CERRADO",       base: [1.3, 1.3, 1.3, 1.3],     tip: [1.2, 1.2, 1.2, 1.2],     thumb: 1 },
      cylinder: { name: "AGARRE CILÍNDRICO",  base: [0.85, 0.9, 0.9, 0.85],   tip: [0.55, 0.6, 0.6, 0.55],   thumb: 0.65 },
      pinch:    { name: "PINZA DE PRECISIÓN", base: [0.75, 0.12, 0.1, 0.1],   tip: [0.6, 0.1, 0.08, 0.08],   thumb: 0.85 }
    };
    let mode = "fist";
    let grip = 0;          // posición actual 0 (abierta) .. 1 (cerrada)
    let target = 0;        // posición pedida
    let manualGrip = 0;
    let control = "EMG";
    let estop = false;
    let lastEventAt = -1e9;
    let shoulderAngle = 0;
    let elbowAngle = 0;
    let wristAngle = 0;

    // Los dedos flexionan alrededor del eje X (hacia la palma, lado +Z).
    function applyPose() {
      const m = MODES[mode];
      fingerPivots.forEach(({ base, tip }, i) => {
        base.rotation.x = -grip * m.base[i];
        tip.rotation.x = -grip * m.tip[i];
      });
      thumbBase.rotation.z = -0.82 + grip * m.thumb * 0.75;
      thumbBase.rotation.x = -grip * m.thumb * 0.55;
      thumbTip.rotation.x = -grip * m.thumb * 0.7;
    }

    const gripInput = document.getElementById("arm-grip");
    function setGrip(value) {
      manualGrip = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
      if (gripInput) gripInput.value = Math.round(manualGrip * 100);
      if (control === "MANUAL" && !estop) target = manualGrip;
    }
    gripInput?.addEventListener("input", () => setGrip(Number(gripInput.value) / 100));

    function setMode(key) {
      if (!MODES[key]) return;
      mode = key;
      document.querySelectorAll("[data-grip-mode]").forEach(b =>
        b.classList.toggle("on", b.dataset.gripMode === key));
      applyPose();
    }
    document.querySelectorAll("[data-grip-mode]").forEach(b =>
      b.addEventListener("click", () => setMode(b.dataset.gripMode)));
    applyPose();

    function bindRange(id, setter, outputId, suffix = "°") {
      const input = document.getElementById(id);
      if (!input) return;
      const update = () => {
        const value = Number(input.value);
        setter(value * Math.PI / 180);
        const output = document.getElementById(outputId);
        if (output) output.textContent = `${value}${suffix}`;
      };
      input.addEventListener("input", update);
      update();
    }

    bindRange("arm-shoulder", value => {
      shoulderAngle = value;
      shoulder.rotation.z = value;
    }, "shoulderValue");
    bindRange("arm-elbow", value => {
      elbowAngle = value;
      elbow.rotation.z = -value;
    }, "elbowValue");
    bindRange("arm-wrist", value => {
      wristAngle = value;
      wrist.rotation.z = value;
      palm.rotation.z = value * 0.12;
    }, "wristValue");

    function setAngles({ shoulder: s, elbow: e, wrist: w } = {}) {
      if (Number.isFinite(s)) document.getElementById("arm-shoulder").value = s;
      if (Number.isFinite(e)) document.getElementById("arm-elbow").value = e;
      if (Number.isFinite(w)) document.getElementById("arm-wrist").value = w;
      ["arm-shoulder", "arm-elbow", "arm-wrist"].forEach(id => {
        document.getElementById(id)?.dispatchEvent(new Event("input"));
      });
    }

    // EMG -> mano: la señal procesada decide si el agarre se cierra o se abre.
    window.addEventListener("ironhand:emg", event => {
      const d = event.detail || {};
      lastEventAt = performance.now();
      control = d.control || "EMG";
      const wasStopped = estop;
      estop = !!d.estop;
      if (estop) {
        target = 0;                                   // posición segura
        if (!wasStopped) setAngles({ shoulder: 0, elbow: 0, wrist: 0 });
        setStatus("PARADA DE EMERGENCIA · MANO EN POSICIÓN SEGURA", true);
      } else if (control === "EMG") {
        target = d.contracted ? 1 : 0;
        setStatus(`EMG ${Math.round(d.envelope)}% / UMBRAL ${Math.round(d.threshold)}% · ` +
          (d.contracted ? "CONTRACCIÓN → CERRANDO" : "RELAJACIÓN → ABRIENDO"));
      } else {
        target = manualGrip;
        setStatus("CONTROL MANUAL");
      }
    });

    function resetView() { viewYaw = -0.12; viewPitch = 0.04; zoom = 1; }
    function reset() {
      setAngles({ shoulder: 0, elbow: 0, wrist: 0 });
      setGrip(0);
      grip = target = 0;
      setMode("fist");
      resetView();
    }
    window.addEventListener("ironhand:reset", reset);

    // API para la presentación y para los diagnósticos.
    window.IRONHAND_ARM = {
      setGrip, setMode, setAngles, reset,
      getGrip: () => grip,
      lastEventAge: () => performance.now() - lastEventAt,
      // Prueba real: cierra y abre el modelo y comprueba que los dedos se mueven.
      selfTest() {
        const saved = grip;
        grip = 1; applyPose();
        const closed = fingerPivots[0].base.rotation.x;
        grip = 0; applyPose();
        const open = fingerPivots[0].base.rotation.x;
        grip = saved; applyPose();
        return closed < -0.2 && Math.abs(open) < 0.01;
      }
    };

    // Pointer drag rotates the complete model; wheel zooms.
    let dragging = false, lastX = 0, lastY = 0;
    let viewYaw = -0.12, viewPitch = 0.04, zoom = 1;
    renderer.domElement.addEventListener("pointerdown", event => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    });
    renderer.domElement.addEventListener("pointermove", event => {
      if (!dragging) return;
      viewYaw += (event.clientX - lastX) * 0.008;
      viewPitch = THREE.MathUtils.clamp(
        viewPitch + (event.clientY - lastY) * 0.006, -0.8, 0.8
      );
      lastX = event.clientX;
      lastY = event.clientY;
    });
    const stopDrag = () => { dragging = false; };
    renderer.domElement.addEventListener("pointerup", stopDrag);
    renderer.domElement.addEventListener("pointercancel", stopDrag);
    renderer.domElement.addEventListener("wheel", event => {
      event.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom + event.deltaY * 0.001, 0.72, 1.45);
    }, { passive: false });

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize);
    resize();

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      // Movimiento suave hacia la posición pedida.
      grip += (target - grip) * Math.min(1, dt * (estop ? 10 : 6));
      if (Math.abs(target - grip) < 0.002) grip = target;
      applyPose();
      if (gripInput && (control === "EMG" || estop)) gripInput.value = Math.round(grip * 100);
      put("gripValue", Math.round(grip * 100) + "%");
      put("openingValue", Math.round((1 - grip) * 100) + "%");
      put("flexValue", Math.round(-fingerPivots[0].base.rotation.x * 180 / Math.PI) + "°");
      put("gripModeValue", MODES[mode].name);
      put("gripStateValue", grip > 0.85 ? "CERRADA" : grip < 0.05 ? "ABIERTA" : "EN MOVIMIENTO");
      if (container.offsetParent === null) return;   // diapositiva oculta: no dibujar
      root.rotation.y = viewYaw;
      root.rotation.x = viewPitch;
      root.scale.setScalar(zoom);
      // Small idle movement keeps the model from looking like a static screenshot.
      shoulder.rotation.x = Math.sin(t * 0.55) * 0.025;
      renderer.render(scene, camera);
    }
    animate();
    STATUS.renderer = "READY";
    STATUS.source = source;
    setStatus("3D ACTIVO · ARRASTRA PARA ROTAR");
    window.dispatchEvent(new CustomEvent("ironhand:arm-ready"));
    console.info("[IRONHAND] Brazo 3D iniciado correctamente.");
  } catch (error) {
    fail("ERROR AL CONSTRUIR EL MODELO 3D (¿WEBGL DESACTIVADO?)", error);
  }
}

startIronhandArm();
