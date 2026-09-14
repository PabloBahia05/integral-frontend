import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ── Visor 3D de un modelo .glb (exportado desde SketchUp) ──────────────────
// Todo pasa en el navegador con three.js — no depende de ninguna cuenta ni
// login de Trimble/SketchUp, ni de subir nada a Trimble Connect. Requiere
// que el paquete "three" esté instalado (`npm install three`); si
// VisorDWG.jsx ya lo usa para el visor de módulos DXF, ya debería estar.
//
// Panel lateral: lista de "componentes" = nodos con nombre en el modelo
// (Mesh o Group). Si el .glb se exportó bien desde SketchUp, cada
// grupo/componente de SketchUp aparece acá con su nombre real. Clic en uno
// lo aísla (atenúa el resto del modelo); clic de nuevo, o "Mostrar todo",
// vuelve a la vista completa.
export default function VisorSketchUp({ url }) {
  const containerRef = useRef(null);
  const modeloRef = useRef(null);

  const [componentes, setComponentes] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ── Carga del modelo + loop de render (se rearma si cambia `url`) ───────
  useEffect(() => {
    if (!url || !containerRef.current) return;

    let cancelado = false;
    setCargando(true);
    setError("");
    setComponentes([]);
    setSeleccionado(null);

    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14161a);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.01,
      5000,
    );
    camera.position.set(3, 3, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (cancelado) return;
        const modelo = gltf.scene;
        modeloRef.current = modelo;
        scene.add(modelo);

        // Centrar el modelo en el origen y encuadrar la cámara según su
        // tamaño real (los modelos exportados desde SketchUp vienen en
        // escalas y posiciones muy distintas entre sí).
        const box = new THREE.Box3().setFromObject(modelo);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        modelo.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        camera.position.set(maxDim, maxDim * 0.8, maxDim * 1.4);
        camera.near = maxDim / 100;
        camera.far = maxDim * 100;
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.update();

        // "Componentes" = nodos con nombre (Mesh o Group). SketchUp exporta
        // cada componente/grupo del modelo como un nodo con su nombre real
        // en la jerarquía del glTF; los nodos sin nombre se descartan acá
        // porque no sirven para identificar nada en la lista.
        const encontrados = [];
        modelo.traverse((obj) => {
          if (obj.name && (obj.isMesh || obj.isGroup)) {
            encontrados.push({ uuid: obj.uuid, name: obj.name });
          }
        });
        setComponentes(encontrados);
        setCargando(false);
      },
      undefined,
      (err) => {
        if (cancelado) return;
        console.error("Error cargando .glb:", err);
        setError("No se pudo cargar el modelo 3D. ¿Es un .glb válido?");
        setCargando(false);
      },
    );

    let frameId;
    const animar = () => {
      frameId = requestAnimationFrame(animar);
      controls.update();
      renderer.render(scene, camera);
    };
    animar();

    const onResize = () => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelado = true;
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      container.innerHTML = "";
      modeloRef.current = null;
    };
  }, [url]);

  // ── Aislar/resaltar el componente elegido ───────────────────────────────
  // null = mostrar todo el modelo normal. Si hay uno elegido, atenúa
  // (opacity baja) todo lo que no sea ese nodo ni esté dentro de él.
  useEffect(() => {
    const modelo = modeloRef.current;
    if (!modelo) return;
    modelo.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const perteneceASeleccionado =
        seleccionado == null || estaDentroDe(obj, seleccionado);
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        m.transparent = true;
        m.opacity = perteneceASeleccionado ? 1 : 0.08;
      });
    });
  }, [seleccionado, componentes]);

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      <div ref={containerRef} style={{ flex: 1, position: "relative" }}>
        {cargando && <div style={overlayStyle}>⏳ Cargando modelo 3D...</div>}
        {error && (
          <div style={{ ...overlayStyle, color: "#e57373" }}>{error}</div>
        )}
      </div>

      <div
        style={{
          width: 240,
          flexShrink: 0,
          borderLeft: "1px solid #2a2e36",
          background: "#0f1115",
          color: "#e0e0e0",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid #2a2e36",
            fontWeight: 600,
          }}
        >
          Componentes {componentes.length > 0 && `(${componentes.length})`}
        </div>

        {!cargando && componentes.length === 0 && !error && (
          <div style={{ padding: 14, color: "#8a8f98" }}>
            El modelo no tiene componentes nombrados.
          </div>
        )}

        {seleccionado && (
          <button
            onClick={() => setSeleccionado(null)}
            style={{
              margin: 10,
              background: "none",
              border: "1px solid #3a3f4a",
              borderRadius: 4,
              color: "#8fb8e0",
              cursor: "pointer",
              fontSize: 12,
              padding: "4px 8px",
            }}
          >
            ← Mostrar todo
          </button>
        )}

        {componentes.map((c) => (
          <div
            key={c.uuid}
            onClick={() =>
              setSeleccionado((prev) => (prev === c.uuid ? null : c.uuid))
            }
            title={c.name}
            style={{
              padding: "8px 14px",
              cursor: "pointer",
              background: seleccionado === c.uuid ? "#1e2530" : "transparent",
              borderBottom: "1px solid #1c1f26",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {c.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// El propio objeto, o cualquiera de sus descendientes, es el elegido.
function estaDentroDe(obj, uuidElegido) {
  let actual = obj;
  while (actual) {
    if (actual.uuid === uuidElegido) return true;
    actual = actual.parent;
  }
  return false;
}

const overlayStyle = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#8a8f98",
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
  background: "rgba(15,17,21,0.6)",
};
