import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to write CRC32 and PNG chunks
function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  
  // Calculate CRC32
  let crc = 0xffffffff;
  const combined = Buffer.concat([typeBuf, data]);
  for (let i = 0; i < combined.length; i++) {
    crc ^= combined[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  const width = size;
  const height = size;

  // IHDR: width, height, bit depth (8), color type (6 = RGBA), compression (0), filter (0), interlace (0)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Raw image data: height rows, each row starts with filter byte 0 followed by width * 4 RGBA bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const radius = width * 0.22;
  const center = width / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Rounded rectangle test
      const dx = Math.max(0, Math.abs(x - center) - (center - radius));
      const dy = Math.max(0, Math.abs(y - center) - (center - radius));
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Inside rounded icon
        // Gradient from teal (#0E6973) to cyan (#208B99)
        const t = (x + y) / (width * 2);
        let r = Math.round(14 + t * 18);
        let g = Math.round(105 + t * 34);
        let b = Math.round(115 + t * 38);
        let a = 255;

        // Draw inner white invoice card
        const cardX1 = width * 0.28;
        const cardX2 = width * 0.72;
        const cardY1 = height * 0.24;
        const cardY2 = height * 0.76;

        if (x >= cardX1 && x <= cardX2 && y >= cardY1 && y <= cardY2) {
          // Document paper: white
          r = 255;
          g = 255;
          b = 255;

          // Lines on invoice
          const relY = (y - cardY1) / (cardY2 - cardY1);
          const relX = (x - cardX1) / (cardX2 - cardX1);

          // Header bar
          if (relY >= 0.12 && relY <= 0.22 && relX >= 0.15 && relX <= 0.85) {
            r = 14; g = 105; b = 115;
          }
          // Line 1
          if (relY >= 0.35 && relY <= 0.42 && relX >= 0.15 && relX <= 0.85) {
            r = 203; g = 213; b = 225;
          }
          // Line 2
          if (relY >= 0.50 && relY <= 0.57 && relX >= 0.15 && relX <= 0.65) {
            r = 203; g = 213; b = 225;
          }
          // Total accent
          if (relY >= 0.68 && relY <= 0.78 && relX >= 0.45 && relX <= 0.85) {
            r = 32; g = 139; b = 153;
          }
        }

        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = a;
      } else {
        // Transparent outside rounded icon
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve(__dirname, 'public');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), generatePng(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), generatePng(512));
console.log('Generated icon-192.png and icon-512.png successfully!');
