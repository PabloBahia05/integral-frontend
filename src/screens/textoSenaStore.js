// Estado del "texto de seña y condiciones" (recuadro amarillo del PDF de
// Presupuesto). Vive ÚNICAMENTE en memoria del front, como variable de
// módulo compartida entre pantallas mientras la app sigue cargada:
// - Se edita desde Ver Tablas → "Texto de Seña" (setTextoSenaGlobal).
// - PresupuestoNuevo lo lee en modo solo-lectura con el hook useTextoSena.
// - No se persiste en localStorage ni en el backend: se pierde al recargar
//   la página, momento en el que vuelve a arrancar en TEXTO_SENA_DEFAULT.
import { useEffect, useState } from "react";

export const TEXTO_SENA_DEFAULT = `IMPORTANTE: SE ENTREGA UNA SEÑA DEL 50%, EL 50% RESTANTE AL MOMENTO DE LA ENTREGA
EN CASO DE QUE SE RETRASE LA OBRA POR RAZONES AJENAS A LA EMPRESA,
EL SALDO SE PUEDE CANCELAR DENTRO DE LOS PLAZOS ESTIPULADOS O SE ACTUALIZARA EL SALDO

ES RESPONSABILIDAD DEL CLIENTE INFORMAR DE MANERA ESCRITA LAS MEDIDAS Y MODELOS DE LOS ARTEFACTOS QUE PONDRA EN SU COCINA, ESTO IMPLICA PORTA HORNO, ANAFE, COCINA, SPAR/CAMPANA, PILETA, ESPESOR DEL MARMOL Y CUALQUIER OTRO ARTEFACTO A TENER EN CUANTA.
LA EMPRESA NO SE HACE CARGO DE LA OMISION U OLVIDO DE DICHOS DATOS`;

let textoSenaActual = TEXTO_SENA_DEFAULT;
const listeners = new Set();

export function getTextoSena() {
  return textoSenaActual;
}

export function setTextoSenaGlobal(nuevoTexto) {
  textoSenaActual = nuevoTexto;
  listeners.forEach((fn) => fn(textoSenaActual));
}

export function subscribeTextoSena(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Hook de solo lectura para componentes React (ej. PresupuestoNuevo): se
// re-renderiza solo si otra pantalla (Ver Tablas) cambia el texto mientras
// este componente sigue montado.
export function useTextoSena() {
  const [valor, setValor] = useState(textoSenaActual);
  useEffect(() => subscribeTextoSena(setValor), []);
  return valor;
}
