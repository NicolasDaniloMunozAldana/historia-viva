// APIs de dispositivo (Sesión 24): cámara y ubicación. Cada función devuelve una promesa o un mensaje ya
// redactado para el usuario: la interfaz no necesita conocer los códigos de error del navegador.
import type { Ubicacion } from "./db";

export type EstadoPermiso = "granted" | "denied" | "prompt" | "desconocido";

// Consulta el estado sin mostrar ningún aviso; no todos los navegadores soportan todos los nombres.
export async function estadoPermiso(nombre: "camera" | "geolocation"): Promise<EstadoPermiso> {
  try {
    const r = await navigator.permissions.query({ name: nombre as PermissionName });
    return r.state;
  } catch {
    return "desconocido";
  }
}

export function hayCamara(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export function abrirCamara(facingMode: "user" | "environment" = "environment") {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
}

// Detiene CADA pista: si no, el LED queda encendido y ninguna otra app puede usar la cámara.
export function detenerCamara(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((pista) => pista.stop());
}

export function describirErrorCamara(err: unknown): string {
  switch ((err as { name?: string } | null)?.name) {
    case "NotAllowedError":
      return "Bloqueaste el permiso de la cámara. Habilítalo desde el candado de la barra de direcciones.";
    case "NotFoundError":
      return "Este dispositivo no tiene cámara disponible.";
    case "NotReadableError":
      return "La cámara está siendo usada por otra aplicación.";
    case "OverconstrainedError":
      return "La cámara no soporta la configuración pedida.";
    case "TypeError":
      return "La cámara solo funciona con HTTPS o en localhost.";
    default:
      return "No se pudo abrir la cámara. Puedes elegir una imagen de la galería.";
  }
}

function canvasABlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen."))), "image/jpeg", 0.8),
  );
}

// Dibuja el fotograma actual en un <canvas> y lo exporta a JPEG. Máximo 640 px de ancho: una foto de
// teléfono pesa varios MB y llenar IndexedDB con eso no tiene sentido para una evidencia.
export function capturarFoto(video: HTMLVideoElement, anchoMax = 640): Promise<Blob> {
  const escala = Math.min(1, anchoMax / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * escala);
  canvas.height = Math.round(video.videoHeight * escala);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvasABlob(canvas);
}

// La misma reducción para una imagen elegida de la galería (alternativa cuando no hay cámara).
export async function reducirImagen(archivo: Blob, anchoMax = 640): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, anchoMax / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasABlob(canvas);
}

export function obtenerUbicacion({ altaPrecision = false, timeoutMs = 10000 } = {}): Promise<Ubicacion> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject({ code: 0, message: "Geolocation no disponible" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          precision: Math.round(pos.coords.accuracy),
          momento: new Date(pos.timestamp).toISOString(),
        }),
      reject,
      { enableHighAccuracy: altaPrecision, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

export function describirErrorUbicacion(err: unknown): string {
  switch ((err as { code?: number } | null)?.code) {
    case 1:
      return "No diste permiso de ubicación. El registro se puede guardar igual, sin ella.";
    case 2:
      return "No se pudo determinar la posición (sin señal GPS o de red).";
    case 3:
      return "La ubicación tardó demasiado en responder. Intenta de nuevo.";
    default:
      return "La ubicación no está disponible en este navegador.";
  }
}

export function formatearUbicacion(u: Ubicacion): string {
  return `${u.lat.toFixed(4)}, ${u.lon.toFixed(4)} (±${u.precision} m)`;
}
