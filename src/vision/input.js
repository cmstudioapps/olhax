const fs = require("node:fs/promises");

const DATA_URI_BASE64 = /^data:image\/[a-z0-9.+-]+;base64,([\s\S]+)$/i;
const BASE64_CHARS = /^[A-Za-z0-9+/]+={0,2}$/;

async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

function isPng(buffer) {
  return buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a;
}

function isJpeg(buffer) {
  return buffer.length >= 3
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[2] === 0xff;
}

function isWebp(buffer) {
  return buffer.length >= 12
    && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP";
}

function isSupportedImage(buffer) {
  return isPng(buffer) || isJpeg(buffer) || isWebp(buffer);
}

function decodeBase64Image(value, requireKnownImage = true) {
  const clean = String(value).replace(/\s+/g, "");

  if (clean.length < 16 || clean.length % 4 === 1 || !BASE64_CHARS.test(clean)) {
    return null;
  }

  const padded = clean.padEnd(Math.ceil(clean.length / 4) * 4, "=");
  const buffer = Buffer.from(padded, "base64");

  if (requireKnownImage && !isSupportedImage(buffer)) {
    return null;
  }

  return buffer;
}

async function normalizeImageInput(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);

  if (typeof input !== "string") return input;

  const trimmed = input.trim();
  const dataUri = DATA_URI_BASE64.exec(trimmed);

  if (dataUri) {
    const buffer = decodeBase64Image(dataUri[1], false);
    return buffer || input;
  }

  if (await exists(input)) return input;

  return decodeBase64Image(trimmed) || input;
}

module.exports = {
  normalizeImageInput,
  decodeBase64Image,
  isSupportedImage
};
