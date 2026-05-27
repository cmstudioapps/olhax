const { createError } = require("../i18n");

function createMicRecorder(options = {}) {
  let createMic;

  try {
    createMic = require("mic");
  } catch (error) {
    throw createError("audioUnavailable", options.language, { cause: error });
  }

  const instance = createMic({
    rate: String(options.sampleRate || 16000),
    channels: String(options.channels || 1),
    bitwidth: String(options.bitDepth || 16),
    encoding: "signed-integer",
    endian: "little",
    device: options.device,
    fileType: "raw",
    debug: Boolean(options.debug),
    exitOnSilence: 0
  });

  return {
    stream: instance.getAudioStream(),
    start() {
      instance.start();
    },
    stop() {
      instance.stop();
    }
  };
}

module.exports = { createMicRecorder };
