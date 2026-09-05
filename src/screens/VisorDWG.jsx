import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Visor 3D de un mueble convertido desde DXF (exportado nativamente, con
 * datos ACIS completos).
 *
 * Uso (standalone, subiendo un archivo elegido afuera):
 *   <VisorDWG file={archivoDxfSeleccionado} apiUrl="/api/dwg" />
 *
 * Uso (modo producción, cargando/guardando el módulo de un codpro):
 *   <VisorDWG
 *     codigo={row.codpro}
 *     modelosApiUrl={API}
 *     apiUrl={`${API}/api/dwg`}
 *   />
 *   Al montar hace GET a /modelos-3d/:codigo (tabla `modelos_3d`, separada
 *   de `produccion`). Si ya hay un modelo guardado lo renderiza directo
 *   (sin volver a convertir); si no hay, muestra un input propio para
 *   subir el .dxf, lo convierte vía /convert y guarda el resultado con
 *   POST a la misma ruta para no tener que reconvertir la próxima vez
 *   que se abra.
 *
 * Sube el .dxf al microservicio /convert, recibe el JSON de malla (paneles
 * como sólidos cerrados por convex hull, agujeros como cilindros, textos
 * como sprites que miran a cámara) y lo renderiza con Three.js. Control de
 * cámara implementado a mano (sin three/examples) para no depender de una
 * ruta de CDN que puede no existir según el proveedor.
 */
export default function VisorDWG({ file: externalFile, apiUrl, token, codigo, modelosApiUrl }) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [status, setStatus] = useState(codigo ? "checking" : "idle");
  // idle | checking | needs-upload | uploading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [meta, setMeta] = useState(null);
  const [file, setFile] = useState(externalFile ?? null);
  const [holesVisible, setHolesVisible] = useState(true);
  const [textsVisible, setTextsVisible] = useState(true);
  const [viewMode, setViewMode] = useState("solido"); // "solido" | "lineas"
  const holeMeshRef = useRef(null);
  const holeEdgesRef = useRef(null);
  const panelMeshRef = useRef(null);
  const edgesSolidRef = useRef(null);
  const edgesWireRef = useRef(null);
  const textGroupRef = useRef(null);

  // Modo standalone: si el `file` que nos pasan desde afuera cambia, lo
  // reflejamos acá.
  useEffect(() => {
    if (externalFile) setFile(externalFile);
  }, [externalFile]);

  // Modo producción: al montar, preguntar si ya hay un módulo guardado
  // (tabla modelos_3d) antes de pedir el .dxf.
  useEffect(() => {
    if (!codigo) return;
    let cancelled = false;

    async function check() {
      setStatus("checking");
      setErrorMsg("");
      try {
        const res = await fetch(
          `${modelosApiUrl}/modelos-3d/${codigo}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (res.status === 404) {
          if (!cancelled) setStatus("needs-upload");
          return;
        }
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setMeta(data.mesh ?? data);
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message);
          setStatus("error");
        }
      }
    }
    check();
    return () => { cancelled = true; };
  }, [codigo, modelosApiUrl, token]);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".dxf")) {
      alert("El archivo debe ser .dxf.");
      return;
    }
    setFile(f);
  }

  function handleReemplazar() {
    if (!codigo) return;
    fetch(`${modelosApiUrl}/modelos-3d/${codigo}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch((err) => console.error("Error borrando modelo 3D:", err));
    setMeta(null);
    setFile(null);
    setStatus("needs-upload");
  }

  // Subir y convertir: dispara tanto en modo standalone (file por prop)
  // como en modo producción (file elegido en el input propio de acá abajo).
  useEffect(() => {
    if (!file) return;
    let cancelled = false;

    async function upload() {
      setStatus("uploading");
      setErrorMsg("");
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${apiUrl}/convert`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Error ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        setMeta(data);
        setStatus("ready");

        // Modo producción: además de renderizar, guardamos el resultado
        // en modelos_3d para no tener que reconvertir la próxima vez.
        if (codigo) {
          fetch(`${modelosApiUrl}/modelos-3d/${codigo}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
          }).catch((err) => console.error("Error guardando modelo 3D:", err));
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message);
          setStatus("error");
        }
      }
    }
    upload();
    return () => { cancelled = true; };
  }, [file, apiUrl, token, codigo, modelosApiUrl]);

  // 2) Renderizar con Three.js cuando llega la malla
  useEffect(() => {
    if (status !== "ready" || !meta || !containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1d23);

    const camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 5000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- Paneles (sólidos, ya vienen triangulados como convex hull) ---
    const panelGeo = new THREE.BufferGeometry();
    panelGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(meta.panel_mesh.positions), 3));
    panelGeo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(meta.panel_mesh.normals), 3));
    panelGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(meta.panel_mesh.colors), 3));
    panelGeo.setIndex(meta.panel_mesh.indices);

    panelGeo.computeBoundingBox();
    const bbox = panelGeo.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    panelGeo.translate(-center.x, -center.y, -center.z);
    panelGeo.computeBoundingSphere();
    const radius = panelGeo.boundingSphere.radius || 50;

    const panelMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.7, metalness: 0.04, side: THREE.DoubleSide,
    });
    const panelMesh = new THREE.Mesh(panelGeo, panelMat);
    panelMesh.visible = viewMode === "solido";
    scene.add(panelMesh);
    panelMeshRef.current = panelMesh;

    // Aristas "sutiles" (solo entre caras con ángulo pronunciado, umbral 25°):
    // se usan como refuerzo visual sobre el sólido, modo por default.
    const edgesSolid = new THREE.LineSegments(
      new THREE.EdgesGeometry(panelGeo, 25),
      new THREE.LineBasicMaterial({ color: 0x2b2418, opacity: 0.3, transparent: true })
    );
    edgesSolid.visible = viewMode === "solido";
    scene.add(edgesSolid);
    edgesSolidRef.current = edgesSolid;

    // Aristas "completas" (umbral 1°, todas las líneas del contorno real):
    // el modo "Líneas (CAD)" — arranca oculto, se muestra al togglear.
    const edgesWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(panelGeo, 1),
      new THREE.LineBasicMaterial({ color: 0xe8eef5 })
    );
    edgesWire.visible = viewMode === "lineas";
    scene.add(edgesWire);
    edgesWireRef.current = edgesWire;

    // --- Agujeros ---
    // Color por vértice (viene resuelto desde el DXF: capa o color propio
    // de cada CIRCLE, ver converter.py del dwg-converter) — mismo esquema
    // que ya usan los paneles (vertexColors).
    let holeMesh = null;
    if (meta.hole_mesh.indices.length > 0) {
      const holeGeo = new THREE.BufferGeometry();
      holeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(meta.hole_mesh.positions), 3));
      holeGeo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(meta.hole_mesh.normals), 3));
      if (meta.hole_mesh.colors) {
        holeGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(meta.hole_mesh.colors), 3));
      }
      holeGeo.setIndex(meta.hole_mesh.indices);
      holeGeo.translate(-center.x, -center.y, -center.z);
      holeMesh = new THREE.Mesh(
        holeGeo,
        meta.hole_mesh.colors
          ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.1 })
          : new THREE.MeshStandardMaterial({ color: 0x1c1a16, roughness: 0.9, metalness: 0.1 })
      );
      holeMesh.visible = viewMode === "solido";
      scene.add(holeMesh);
      holeMeshRef.current = holeMesh;

      const holeEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(holeGeo, 1),
        new THREE.LineBasicMaterial({ color: 0xe8eef5 })
      );
      holeEdges.visible = viewMode === "lineas";
      scene.add(holeEdges);
      holeEdgesRef.current = holeEdges;
    }

    // --- Etiquetas de texto (sprites canvas, siempre miran a cámara) ---
    function makeTextSprite(text) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const fontSize = 48;
      ctx.font = `bold ${fontSize}px monospace`;
      const w = Math.max(64, ctx.measureText(text).width + 20);
      canvas.width = w;
      canvas.height = fontSize + 16;
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = "rgba(20,22,28,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 10, canvas.height / 2);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true, depthWrite: false }));
      const scale = radius * 0.05;
      sprite.scale.set(scale * (canvas.width / canvas.height), scale, 1);
      return sprite;
    }

    const textGroup = new THREE.Group();
    (meta.texts || []).forEach((t) => {
      const sprite = makeTextSprite(t.text);
      sprite.position.set(t.pos[0] - center.x, t.pos[1] - center.y, t.pos[2] - center.z);
      textGroup.add(sprite);
    });
    scene.add(textGroup);
    textGroupRef.current = textGroup;

    // --- Luces ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dir1.position.set(radius * 1.5, radius * 2, radius * 1.2);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xaac8ff, 0.35);
    dir2.position.set(-radius * 1.5, radius * 0.5, -radius * 1.5);
    scene.add(dir2);

    const grid = new THREE.GridHelper(radius * 3, 20, 0x3a3f4a, 0x2a2e36);
    grid.position.y = bbox.min.y - center.y;
    scene.add(grid);

    // --- Control de cámara (orbit manual, sin dependencia externa) ---
    const spherical = { radius: radius * 2.6, theta: Math.PI * 0.28, phi: Math.PI * 0.38 };
    const target = new THREE.Vector3(0, 0, 0);
    const minR = radius * 0.3, maxR = radius * 6;

    function updateCamera() {
      const s = Math.sin(spherical.phi) * spherical.radius;
      camera.position.set(
        s * Math.sin(spherical.theta) + target.x,
        Math.cos(spherical.phi) * spherical.radius + target.y,
        s * Math.cos(spherical.theta) + target.z
      );
      camera.lookAt(target);
    }
    updateCamera();

    let dragging = false, lastX = 0, lastY = 0, lastPinch = null;
    const down = (x, y) => { dragging = true; lastX = x; lastY = y; };
    const move = (x, y) => {
      if (!dragging) return;
      spherical.theta -= (x - lastX) * 0.006;
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi - (y - lastY) * 0.006));
      lastX = x; lastY = y;
      updateCamera();
    };
    const up = () => { dragging = false; };
    const zoom = (delta) => {
      spherical.radius = Math.max(minR, Math.min(maxR, spherical.radius * (1 + delta)));
      updateCamera();
    };

    const el = renderer.domElement;
    const onMouseDown = (e) => down(e.clientX, e.clientY);
    const onMouseMove = (e) => move(e.clientX, e.clientY);
    const onWheel = (e) => { e.preventDefault(); zoom(e.deltaY * 0.001); };
    const onTouchStart = (e) => {
      if (e.touches.length === 1) down(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2) {
        dragging = false;
        const [a, b] = e.touches;
        lastPinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      }
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2 && lastPinch !== null) {
        const [a, b] = e.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        zoom((lastPinch - dist) * 0.005);
        lastPinch = dist;
      }
    };
    const onTouchEnd = (e) => { if (e.touches.length === 0) { dragging = false; lastPinch = null; } };
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", up);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("resize", onResize);

    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", up);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [status, meta]);

  useEffect(() => {
    if (panelMeshRef.current) panelMeshRef.current.visible = viewMode === "solido";
    if (edgesSolidRef.current) edgesSolidRef.current.visible = viewMode === "solido";
    if (edgesWireRef.current) edgesWireRef.current.visible = viewMode === "lineas";
    if (holeMeshRef.current) holeMeshRef.current.visible = holesVisible && viewMode === "solido";
    if (holeEdgesRef.current) holeEdgesRef.current.visible = holesVisible && viewMode === "lineas";
  }, [viewMode, holesVisible]);

  useEffect(() => {
    if (textGroupRef.current) textGroupRef.current.visible = textsVisible;
  }, [textsVisible]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 400 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {status === "checking" && (
        <div style={overlayStyle}>Buscando módulo guardado...</div>
      )}

      {status === "needs-upload" && (
        <div style={{ ...overlayStyle, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <span>Este código todavía no tiene un módulo 3D cargado.</span>
          <input ref={inputRef} type="file" accept=".dxf" onChange={handleFileChange} style={{ display: "none" }} />
          <button
            onClick={() => inputRef.current?.click()}
            style={{ background: "#2b6cb0", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}
          >
            Subir .dxf
          </button>
        </div>
      )}

      {status === "uploading" && (
        <div style={overlayStyle}>Convirtiendo DXF...</div>
      )}
      {status === "error" && (
        <div style={{ ...overlayStyle, color: "#ffb4b4" }}>
          No se pudo procesar el archivo: {errorMsg}
        </div>
      )}

      {status === "ready" && meta && (
        <>
          <div style={infoStyle}>
            <strong>{meta.solid_count} piezas</strong> · {meta.hole_count} perforaciones · {meta.text_count} etiquetas
            {meta.excluded_count > 0 && (
              <div style={{ marginTop: 4, fontSize: 11, color: "#8a8f98" }}>
                ({meta.excluded_count} objeto(s) descartado(s) por estar fuera de los límites del modelo)
              </div>
            )}
          </div>
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                style={{ ...buttonStyle, flex: 1, ...(viewMode === "solido" ? activeButtonStyle : {}) }}
                onClick={() => setViewMode("solido")}
              >
                Sólido
              </button>
              <button
                style={{ ...buttonStyle, flex: 1, ...(viewMode === "lineas" ? activeButtonStyle : {}) }}
                onClick={() => setViewMode("lineas")}
              >
                Líneas (CAD)
              </button>
            </div>
            <button style={buttonStyle} onClick={() => setHolesVisible((v) => !v)}>
              {holesVisible ? "Ocultar" : "Mostrar"} perforaciones
            </button>
            <button style={buttonStyle} onClick={() => setTextsVisible((v) => !v)}>
              {textsVisible ? "Ocultar" : "Mostrar"} etiquetas
            </button>
            {codigo && (
              <button style={buttonStyle} onClick={handleReemplazar}>
                Reemplazar módulo
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const overlayStyle = {
  position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
  color: "#cfd3da", fontFamily: "system-ui, sans-serif", fontSize: 14,
};
const infoStyle = {
  position: "absolute", top: 12, left: 12, background: "rgba(20,22,28,0.65)",
  color: "#cfd3da", padding: "8px 12px", borderRadius: 8, fontSize: 13,
  fontFamily: "system-ui, sans-serif", maxWidth: 240,
};
const buttonStyle = {
  background: "rgba(20,22,28,0.65)",
  color: "#cfd3da", border: "1px solid #3a3f4a", borderRadius: 8,
  padding: "8px 12px", fontSize: 12, cursor: "pointer",
};
const activeButtonStyle = {
  background: "#2b6cb0",
  color: "#fff",
  borderColor: "#2b6cb0",
};
