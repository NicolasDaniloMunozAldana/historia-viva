// Corre después de `next build`: lista los archivos con hash de .next/static
// (CSS, JS y fuentes) en public/sw-assets.js para que sw.js los cachee en install.
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const estaticos = path.join(raiz, ".next", "static");
const permitidas = new Set([".css", ".js", ".woff", ".woff2"]);

function listar(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(dir, entrada.name);
    return entrada.isDirectory() ? listar(ruta) : [ruta];
  });
}

const assets = ["chunks", "media"]
  .map((carpeta) => path.join(estaticos, carpeta))
  .filter((carpeta) => fs.existsSync(carpeta))
  .flatMap(listar)
  .filter((archivo) => permitidas.has(path.extname(archivo)))
  .map((archivo) => "/_next/static/" + path.relative(estaticos, archivo).split(path.sep).join("/"))
  .sort();

fs.writeFileSync(
  path.join(raiz, "public", "sw-assets.js"),
  `self.ASSETS_BUILD = ${JSON.stringify(assets, null, 2)};\n`,
);
console.log(`sw-assets.js generado con ${assets.length} archivos de .next/static`);
