// Genera los íconos PNG del manifest (192, 512 y 512 maskable) sin dependencias externas.
// Misma paleta de Alivia usada en los otros dos proyectos, para mantener una familia visual.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const PURPLE_1 = [0x40, 0x2f, 0x6c];
const GREEN_1 = [0x68, 0xee, 0xb4];

function makePng(size, { maskable = false } = {}) {
  const margin = maskable ? Math.round(size * 0.22) : Math.round(size * 0.14);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - margin;
  const raw = Buffer.alloc(size * (1 + size * 4));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const inCircle = dx * dx + dy * dy <= r * r;
      const [rr, gg, bb] = inCircle ? GREEN_1 : PURPLE_1;
      raw[offset++] = rr;
      raw[offset++] = gg;
      raw[offset++] = bb;
      raw[offset++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon-192.png"), makePng(192));
fs.writeFileSync(path.join(outDir, "icon-512.png"), makePng(512));
fs.writeFileSync(path.join(outDir, "icon-512-maskable.png"), makePng(512, { maskable: true }));
console.log("Íconos generados en public/icons/");
