// Sensores de movimiento (Sesión 25): detectar si el dispositivo tiene sensores de verdad y reconocer
// una sacudida. Son una mejora progresiva: toda acción que se pueda hacer sacudiendo tiene un botón.

export type PermisoSensores = "granted" | "denied" | "no-necesario" | "no-soportado";

// iOS exige un requestPermission() dentro de un clic; en Chrome/Android el método ni existe.
export async function pedirPermisoSensores(): Promise<PermisoSensores> {
  if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return "no-soportado";
  const evento = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> };
  if (typeof evento.requestPermission === "function") {
    try {
      return await evento.requestPermission();
    } catch {
      return "denied";
    }
  }
  return "no-necesario";
}

// Un computador tiene el objeto DeviceMotionEvent pero no sensores: dispara un evento con todo en null.
// Por eso se espera una lectura con valores reales, con un tiempo máximo.
export function hayLecturasReales(timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const alRecibir = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (a && a.x !== null) {
        limpiar();
        resolve(true);
      }
    };
    const limpiar = () => {
      window.removeEventListener("devicemotion", alRecibir);
      clearTimeout(t);
    };
    const t = setTimeout(() => {
      limpiar();
      resolve(false);
    }, timeoutMs);
    window.addEventListener("devicemotion", alRecibir);
  });
}

// Una sacudida es una desviación fuerte y breve respecto a la gravedad (9,81 m/s²). El enfriamiento
// evita que una sola sacudida (decenas de lecturas sobre el umbral) dispare la acción veinte veces.
export function detectarSacudida(
  onSacudida: (desviacion: number) => void,
  { umbral = 12, enfriamientoMs = 1000 } = {},
): () => void {
  const GRAVEDAD = 9.81;
  let ultimaSacudida = 0;
  const manejador = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    const desviacion = Math.abs(Math.hypot(a.x, a.y, a.z) - GRAVEDAD);
    const ahora = performance.now();
    if (desviacion > umbral && ahora - ultimaSacudida > enfriamientoMs) {
      ultimaSacudida = ahora;
      onSacudida(Math.round(desviacion * 10) / 10);
    }
  };
  window.addEventListener("devicemotion", manejador);
  return () => window.removeEventListener("devicemotion", manejador);
}

// Inclinación del dispositivo en grados (beta: adelante/atrás, gamma: izquierda/derecha). Se limita a
// 10 avisos por segundo para no saturar la interfaz y devuelve la función que apaga el sensor.
export function escucharOrientacion(
  callback: (inclinacion: { beta: number; gamma: number }) => void,
  intervaloMs = 100,
): () => void {
  let ultimo = 0;
  const manejador = (e: DeviceOrientationEvent) => {
    const ahora = performance.now();
    if (ahora - ultimo < intervaloMs) return;
    ultimo = ahora;
    if (e.beta === null || e.gamma === null) return; // sin sensor
    callback({ beta: Math.round(e.beta), gamma: Math.round(e.gamma) });
  };
  window.addEventListener("deviceorientation", manejador);
  return () => window.removeEventListener("deviceorientation", manejador);
}
