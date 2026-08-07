// Estado del "texto de seña y condiciones" (recuadro amarillo del PDF de
// Presupuesto). Ahora vive en el backend (tabla `textos`, clave "texto_sena")
// en vez de localStorage:
// - Se edita desde Ver Tablas → "Texto de Seña" (setTextoSenaGlobal).
// - PresupuestoNuevo lo lee en modo solo-lectura con el hook useTextoSena.
// - Al vivir en el backend, ahora SÍ se comparte entre todas las PCs/usuarios
//   (a diferencia de la versión anterior con localStorage, que era local a
//   cada navegador).
// - Se mantiene un caché en memoria (moduleCache) para que los componentes
//   que llaman useTextoSena() no arranquen siempre en blanco mientras llega
//   la respuesta del fetch; igual se refresca contra el backend al montar.
import { useEffect, useState } from "react";

export const TEXTO_SENA_DEFAULT = `IMPORTANTE: SE ENTREGA UNA SEÑA DEL 50%, EL 50% RESTANTE AL MOMENTO DE LA ENTREGA
EN CASO DE QUE SE RETRASE LA OBRA POR RAZONES AJENAS A LA EMPRESA,
EL SALDO SE PUEDE CANCELAR DENTRO DE LOS PLAZOS ESTIPULADOS O SE ACTUALIZARA EL SALDO

ES RESPONSABILIDAD DEL CLIENTE INFORMAR DE MANERA ESCRITA LAS MEDIDAS Y MODELOS DE LOS ARTEFACTOS QUE PONDRA EN SU COCINA, ESTO IMPLICA PORTA HORNO, ANAFE, COCINA, SPAR/CAMPANA, PILETA, ESPESOR DEL MARMOL Y CUALQUIER OTRO ARTEFACTO A TENER EN CUANTA.
LA EMPRESA NO SE HACE CARGO DE LA OMISION U OLVIDO DE DICHOS DATOS`;

const CLAVE = "texto_sena";

// Misma base que usa Productos.jsx — este proyecto no usa variables de
// entorno (VITE_API_URL) para esto, así que va hardcodeada igual que el
// resto del código existente.
const API = "https://integral-backend-production.up.railway.app";

const listeners = new Set();

// Caché en memoria: arranca con el default y se actualiza en cuanto llega
// la primera respuesta real del backend. Sirve para que useTextoSena() no
// tenga que esperar un fetch en cada montaje si ya se pidió antes en esta
// misma sesión de la pestaña.
let moduleCache = TEXTO_SENA_DEFAULT;
let yaSeCargoUnaVez = false;

function notificar(valor) {
  moduleCache = valor;
  listeners.forEach((fn) => fn(valor));
}

// Lee el valor actual conocido en memoria de forma síncrona (para el estado
// inicial de useState). No pega al backend — para eso está fetchTextoSena().
export function getTextoSena() {
  return moduleCache;
}

// Pega al backend y devuelve el valor actual. Además actualiza el caché y
// notifica a todos los componentes suscriptos (otras pestañas/instancias
// montadas de useTextoSena en esta misma página).
// `token` = JWT del usuario logueado (igual que authFetch en Productos.jsx);
// si el endpoint no requiere auth, pasar undefined no rompe nada.
export async function fetchTextoSena(token) {
  try {
    const resp = await fetch(`${API}/textos/${CLAVE}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`GET /textos/${CLAVE} → ${resp.status}`);
    const data = await resp.json();
    const valor = data?.valor ?? TEXTO_SENA_DEFAULT;
    yaSeCargoUnaVez = true;
    notificar(valor);
    return valor;
  } catch (err) {
    // Si el backend no responde, se sigue mostrando lo último conocido (o
    // el estándar si todavía no se cargó nada), para no dejar el recuadro
    // vacío en pantalla.
    console.error("No se pudo obtener el texto de seña del backend:", err);
    return moduleCache;
  }
}

// Guarda el nuevo texto en el backend (tabla textos) y actualiza a todos los
// componentes montados. Se usa desde Ver Tablas → "Texto de Seña".
export async function setTextoSenaGlobal(nuevoTexto, token) {
  // Actualización optimista: se ve el cambio al instante en esta pestaña,
  // aunque el guardado en backend todavía esté en vuelo.
  notificar(nuevoTexto);
  try {
    const resp = await fetch(`${API}/textos/${CLAVE}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ valor: nuevoTexto }),
    });
    if (!resp.ok) throw new Error(`PUT /textos/${CLAVE} → ${resp.status}`);
    const data = await resp.json();
    notificar(data.valor);
    return data;
  } catch (err) {
    console.error("No se pudo guardar el texto de seña en el backend:", err);
    throw err;
  }
}

export function subscribeTextoSena(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Hook de solo lectura para componentes React (ej. PresupuestoNuevo): al
// montar, si nadie pidió el texto todavía en esta sesión de pestaña, lo pide
// al backend; si ya se pidió antes, arranca directo con el último valor
// conocido (moduleCache) y se re-renderiza si otro componente lo cambia
// mientras sigue montado (vía subscribeTextoSena).
// `token` = JWT del usuario logueado, se lo pasa a fetchTextoSena.
export function useTextoSena(token) {
  const [valor, setValor] = useState(getTextoSena());

  useEffect(() => {
    const unsub = subscribeTextoSena(setValor);

    if (!yaSeCargoUnaVez) {
      fetchTextoSena(token);
    }

    return unsub;
  }, [token]);

  return valor;
}
