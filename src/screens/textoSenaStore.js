// Estado del "texto de seña y condiciones" (recuadro amarillo del PDF de
// Presupuesto). Vive ÚNICAMENTE en memoria del front:
// - Se edita desde Ver Tablas → "Texto de Seña" (setTextoSenaGlobal).
// - PresupuestoNuevo lo lee en modo solo-lectura con el hook useTextoSena.
// - No se persiste en localStorage ni en el backend: se pierde al recargar
//   la página, momento en el que vuelve a arrancar en TEXTO_SENA_DEFAULT.
//
// Se guarda colgado de `window` (no en una variable de módulo) a propósito:
// con code-splitting / rutas cargadas como chunks separados, el bundler a
// veces termina incluyendo este archivo más de una vez, y cada copia tendría
// su propia variable en memoria — Ver Tablas y Presupuesto verían valores
// distintos. `window` es el único lugar garantizado como singleton real,
// sin importar cuántas veces se duplique el módulo.
import { useEffect, useState } from "react";

export const TEXTO_SENA_DEFAULT = `IMPORTANTE: SE ENTREGA UNA SEÑA DEL 50%, EL 50% RESTANTE AL MOMENTO DE LA ENTREGA
EN CASO DE QUE SE RETRASE LA OBRA POR RAZONES AJENAS A LA EMPRESA,
EL SALDO SE PUEDE CANCELAR DENTRO DE LOS PLAZOS ESTIPULADOS O SE ACTUALIZARA EL SALDO

ES RESPONSABILIDAD DEL CLIENTE INFORMAR DE MANERA ESCRITA LAS MEDIDAS Y MODELOS DE LOS ARTEFACTOS QUE PONDRA EN SU COCINA, ESTO IMPLICA PORTA HORNO, ANAFE, COCINA, SPAR/CAMPANA, PILETA, ESPESOR DEL MARMOL Y CUALQUIER OTRO ARTEFACTO A TENER EN CUANTA.
LA EMPRESA NO SE HACE CARGO DE LA OMISION U OLVIDO DE DICHOS DATOS`;

function store() {
  if (!window.__textoSenaStore) {
    window.__textoSenaStore = {
      valor: TEXTO_SENA_DEFAULT,
      listeners: new Set(),
    };
  }
  return window.__textoSenaStore;
}

export function getTextoSena() {
  return store().valor;
}

export function setTextoSenaGlobal(nuevoTexto) {
  const s = store();
  s.valor = nuevoTexto;
  s.listeners.forEach((fn) => fn(s.valor));
}

export function subscribeTextoSena(fn) {
  const s = store();
  s.listeners.add(fn);
  return () => s.listeners.delete(fn);
}

// Hook de solo lectura para componentes React (ej. PresupuestoNuevo): se
// re-renderiza solo si otra pantalla (Ver Tablas) cambia el texto mientras
// este componente sigue montado.
export function useTextoSena() {
  const [valor, setValor] = useState(getTextoSena());
  useEffect(() => subscribeTextoSena(setValor), []);
  return valor;
}
