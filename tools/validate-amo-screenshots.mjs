import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const screenshotRoot = join(projectRoot, "amo", "screenshots");
const expectedDimensions = new Map([
  ["01-automatic-cleaning.jpg", [1265, 791]],
  ["02-preview-matches.jpg", [1265, 791]],
  ["03-wipe-confirmation.jpg", [1265, 791]],
  ["04-popup-mobile.jpg", [390, 720]]
]);

function readJpegDimensions(image, filename) {
  if (image[0] !== 0xff || image[1] !== 0xd8) {
    throw new Error(`${filename} is not a JPEG image.`);
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
  ]);
  let offset = 2;
  while (offset + 8 < image.length) {
    while (image[offset] === 0xff) {
      offset += 1;
    }
    const marker = image[offset];
    offset += 1;
    if (startOfFrameMarkers.has(marker)) {
      return [image.readUInt16BE(offset + 5), image.readUInt16BE(offset + 3)];
    }
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    const segmentLength = image.readUInt16BE(offset);
    if (segmentLength < 2) {
      break;
    }
    offset += segmentLength;
  }
  throw new Error(`${filename} has no readable JPEG dimensions.`);
}

for (const [filename, [expectedWidth, expectedHeight]] of expectedDimensions) {
  const image = await readFile(join(screenshotRoot, filename));
  const [width, height] = readJpegDimensions(image, filename);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(
      `${filename} is ${width}x${height}; expected ${expectedWidth}x${expectedHeight}.`
    );
  }
}

console.log(`${expectedDimensions.size} real UI screenshots validated.`);
