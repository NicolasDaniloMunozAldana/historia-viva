// Web Crypto (Sesión 22): clave AES-GCM derivada de una contraseña con PBKDF2 y cifrado de textos.
// Solo disponible en contextos seguros (HTTPS o localhost): fuera de eso `crypto.subtle` no existe.

const ITERACIONES_PBKDF2 = 100000; // mínimo OWASP vigente al escribir la guía; revisar con el tiempo.
const TEXTO_VERIFICADOR = "historiaviva:clave-valida";

export interface TextoCifrado {
  cifrado: ArrayBuffer;
  iv: Uint8Array<ArrayBuffer>;
}

export function cifradoDisponible(): boolean {
  return typeof crypto !== "undefined" && Boolean(crypto.subtle);
}

export function generarSal(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function derivarClaveDesdeContrasena(contrasena: string, sal: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const materialBase = await crypto.subtle.importKey("raw", new TextEncoder().encode(contrasena), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: sal, iterations: ITERACIONES_PBKDF2, hash: "SHA-256" },
    materialBase,
    { name: "AES-GCM", length: 256 },
    false, // no exportable: se vuelve a derivar con la contraseña, nunca se guarda
    ["encrypt", "decrypt"],
  );
}

export async function cifrarTexto(clave: CryptoKey, texto: string): Promise<TextoCifrado> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // distinto en cada operación
  const cifrado = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, clave, new TextEncoder().encode(texto));
  return { cifrado, iv };
}

export async function descifrarTexto(clave: CryptoKey, { cifrado, iv }: TextoCifrado): Promise<string> {
  const datos = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, clave, cifrado);
  return new TextDecoder().decode(datos);
}

// Verificador de contraseña: un texto conocido cifrado con la clave derivada. Si al desbloquear no se
// descifra, la contraseña es incorrecta — evita guardar notas con una clave distinta por una errata.
export function crearVerificador(clave: CryptoKey): Promise<TextoCifrado> {
  return cifrarTexto(clave, TEXTO_VERIFICADOR);
}

export async function verificarClave(clave: CryptoKey, verificador: TextoCifrado): Promise<boolean> {
  try {
    return (await descifrarTexto(clave, verificador)) === TEXTO_VERIFICADOR;
  } catch {
    return false;
  }
}
