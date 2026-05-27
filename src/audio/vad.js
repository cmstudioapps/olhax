function rms16le(chunk) {
  if (!chunk.length) return 0;

  let sum = 0;
  const samples = Math.floor(chunk.length / 2);

  for (let index = 0; index < samples; index += 1) {
    const sample = chunk.readInt16LE(index * 2) / 32768;
    sum += sample * sample;
  }

  return Math.sqrt(sum / samples);
}

function chunkDurationMs(chunk, options = {}) {
  const sampleRate = options.sampleRate || 16000;
  const channels = options.channels || 1;
  const bitDepth = options.bitDepth || 16;
  const bytesPerMs = sampleRate * channels * (bitDepth / 8) / 1000;
  return chunk.length / bytesPerMs;
}

function trimChunks(chunks, maxBytes) {
  let total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

  while (total > maxBytes && chunks.length > 1) {
    const removed = chunks.shift();
    total -= removed.length;
  }

  return total;
}

module.exports = {
  rms16le,
  chunkDurationMs,
  trimChunks
};
