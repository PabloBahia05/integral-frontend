// Estado del "texto de seña y condiciones" (recuadro amarillo del PDF de
// Presupuesto). Se guarda en localStorage del navegador — nada de backend:
// - Se edita desde Ver Tablas → "Texto de Seña" (setTextoSenaGlobal).
// - PresupuestoNuevo lo lee en modo solo-lectura con el hook useTextoSena.
// - Sobrevive a recargas de página (a diferencia de una variable en memoria),
//   pero es local a este navegador/dispositivo — no se comparte entre PCs.
// - getTextoSena() SIEMPRE lee directo de localStorage (no cachea en una
//   variable de módulo), para que no haya rezago: cada vez que se abre el
//   presupuesto, toma el valor actual tal cual esté guardado en ese momento.
import { useEffect, useState } from "react";

export const TEXTO_SENA_DEFAULT = `IMPORTANTE: SE ENTREGA UNA SEÑA DEL 50%, EL 50% RESTANTE AL MOMENTO DE LA ENTREGA
EN CASO DE QUE SE RETRASE LA OBRA POR RAZONES AJENAS A LA EMPRESA,
EL SALDO SE PUEDE CANCELAR DENTRO DE LOS PLAZOS ESTIPULADOS O SE ACTUALIZARA EL SALDO

ES RESPONSABILIDAD DEL CLIENTE INFORMAR DE MANERA ESCRITA LAS MEDIDAS Y MODELOS DE LOS ARTEFACTOS QUE PONDRA EN SU COCINA, ESTO IMPLICA PORTA HORNO, ANAFE, COCINA, SPAR/CAMPANA, PILETA, ESPESOR DEL MARMOL Y CUALQUIER OTRO ARTEFACTO A TENER EN CUANTA.
LA EMPRESA NO SE HACE CARGO DE LA OMISION U OLVIDO DE DICHOS DATOS`;

const STORAGE_KEY = "integral_texto_sena";

const listeners = new Set();

export function getTextoSena() {
  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY);
    return guardado != null ? guardado : TEXTO_SENA_DEFAULT;
  } catch (err) {
    // localStorage puede fallar en modo privado/incógnito de algunos
    // navegadores — en ese caso, se sigue mostrando el estándar.
    console.error("No se pudo leer el texto de seña de localStorage:", err);
    return TEXTO_SENA_DEFAULT;
  }
}

export function setTextoSenaGlobal(nuevoTexto) {
  try {
    window.localStorage.setItem(STORAGE_KEY, nuevoTexto);
  } catch (err) {
    console.error("No se pudo guardar el texto de seña en localStorage:", err);
  }
  listeners.forEach((fn) => fn(nuevoTexto));
}

export function subscribeTextoSena(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Hook de solo lectura para componentes React (ej. PresupuestoNuevo): arranca
// leyendo localStorage en el momento del montaje (nada de valor cacheado de
// antes) y se re-renderiza si Ver Tablas lo cambia mientras sigue montado —
// tanto en la misma pestaña (subscribeTextoSena) como desde otra pestaña
// abierta del mismo navegador (evento nativo "storage").
export function useTextoSena() {
  const [valor, setValor] = useState(getTextoSena());

  useEffect(() => {
    // Por si cambió entre el primer render y este efecto.
    setValor(getTextoSena());

    const unsub = subscribeTextoSena(setValor);

    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setValor(getTextoSena());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return valor;
}
