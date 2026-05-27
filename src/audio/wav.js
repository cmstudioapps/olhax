function writeString(buffer, value, offset) {
  buffer.write(value, offset, "ascii");
}

function toWav(pcm, options = {}) {
  const sampleRate = options.sampleRate || 16000;
  const channels = options.channels || 1;
  const bitDepth = options.bitDepth || 16;
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const header = Buffer.alloc(44);

  writeString(header, "RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  writeString(header, "WAVE", 8);
  writeString(header, "fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  writeString(header, "data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

module.exports = { toWav };
