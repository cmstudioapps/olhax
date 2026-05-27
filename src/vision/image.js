const sharp = require("sharp");
const { normalizeImageInput } = require("./input");

async function loadGray(input, options = {}) {
  const imageInput = await normalizeImageInput(input);
  let pipeline = sharp(imageInput, { failOn: "none" }).rotate();

  if (options.scale && options.scale !== 1) {
    const meta = await pipeline.metadata();
    const width = Math.max(1, Math.round(meta.width * options.scale));
    const height = Math.max(1, Math.round(meta.height * options.scale));
    pipeline = sharp(imageInput, { failOn: "none" }).rotate().resize(width, height);
  }

  if (options.blur) pipeline = pipeline.blur(options.blur === true ? 1 : options.blur);
  if (options.sharpen) pipeline = pipeline.sharpen();
  if (options.normalize) pipeline = pipeline.normalize();

  const { data, info } = await pipeline
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels
  };
}

module.exports = { loadGray };
