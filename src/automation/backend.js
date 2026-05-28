const { createError } = require("../i18n");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");

let cached;

function binaryToBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

function hasRawImageData(value) {
  return Boolean(
    value
    && Number.isFinite(value.width)
    && Number.isFinite(value.height)
    && binaryToBuffer(value.data)
  );
}

async function rawImageToPng(image) {
  const channels = Number.isFinite(image.channels) ? image.channels : 4;
  return sharp(binaryToBuffer(image.data), {
    raw: {
      width: image.width,
      height: image.height,
      channels
    }
  }).png().toBuffer();
}

async function normalizeScreenshotResult(image, language, options = {}) {
  const directBuffer = binaryToBuffer(image);
  if (directBuffer) return directBuffer;

  if (typeof image === "string") {
    return fs.readFile(image);
  }

  if (image && typeof image.path === "string") {
    return fs.readFile(image.path);
  }

  if (image && typeof image.toRGB === "function" && !options.skipToRGB) {
    const rgb = await image.toRGB();
    return normalizeScreenshotResult(rgb, language, { skipToRGB: true });
  }

  if (hasRawImageData(image)) {
    return rawImageToPng(image);
  }

  if (image && image.data !== undefined) {
    const data = binaryToBuffer(image.data);
    if (data) return data;
  }

  throw createError("screenshotUnavailable", language);
}

async function captureWithTempFile(screen, nut, language) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "olhax-screenshot-"));
  try {
    const fileName = "screen";
    const fileFormat = (nut.FileType && nut.FileType.PNG) || ".png";
    const image = await screen.capture(fileName, fileFormat, tempDir);
    return normalizeScreenshotResult(image, language);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function isMissingCaptureFileNameError(error) {
  return Boolean(
    error
    && (
      error.code === "ERR_INVALID_ARG_TYPE"
      || /path.*undefined/i.test(error.message || "")
      || /filename|fileName/i.test(error.message || "")
    )
  );
}

async function captureScreen(screen, nut, language) {
  if (screen.capture.length > 0) {
    return captureWithTempFile(screen, nut, language);
  }

  try {
    return normalizeScreenshotResult(await screen.capture(), language);
  } catch (error) {
    if (!isMissingCaptureFileNameError(error)) throw error;
    return captureWithTempFile(screen, nut, language);
  }
}

function buttonValue(nut, button = "left") {
  const key = String(button).toLowerCase();
  const Button = nut.Button || {};
  if (key === "right") return Button.RIGHT || Button.Right || Button.right || 2;
  if (key === "middle") return Button.MIDDLE || Button.Middle || Button.middle || 1;
  return Button.LEFT || Button.Left || Button.left || 0;
}

function createNutBackend(language, nutOverride) {
  let nut = nutOverride;
  if (!nut) {
    try {
      nut = require("@nut-tree-fork/nut-js");
    } catch (error) {
      throw createError("automationUnavailable", language, { cause: error });
    }
  }

  const { mouse, Point, screen, keyboard } = nut;
  if (!mouse || !Point) throw createError("automationUnavailable", language);

  return {
    async getPosition() {
      if (typeof mouse.getPosition === "function") return mouse.getPosition();
      if (typeof mouse.position === "function") return mouse.position();
      throw createError("automationUnavailable", language);
    },

    async moveTo(x, y) {
      const point = new Point(Math.round(x), Math.round(y));
      if (typeof mouse.setPosition === "function") return mouse.setPosition(point);
      if (typeof mouse.move === "function" && typeof nut.straightTo === "function") {
        return mouse.move(nut.straightTo(point));
      }
      throw createError("automationUnavailable", language);
    },

    async click(button = "left") {
      if (typeof mouse.click === "function") return mouse.click(buttonValue(nut, button));
      throw createError("automationUnavailable", language);
    },

    async doubleClick(button = "left") {
      if (typeof mouse.doubleClick === "function") return mouse.doubleClick(buttonValue(nut, button));
      await this.click(button);
      await this.click(button);
    },

    async press(button = "left") {
      if (typeof mouse.pressButton === "function") return mouse.pressButton(buttonValue(nut, button));
      if (typeof mouse.press === "function") return mouse.press(buttonValue(nut, button));
      throw createError("automationUnavailable", language);
    },

    async release(button = "left") {
      if (typeof mouse.releaseButton === "function") return mouse.releaseButton(buttonValue(nut, button));
      if (typeof mouse.release === "function") return mouse.release(buttonValue(nut, button));
      throw createError("automationUnavailable", language);
    },

    async scroll(dx = 0, dy = 0) {
      const vertical = Math.round(Math.abs(dy));
      const horizontal = Math.round(Math.abs(dx));

      if (dy < 0 && typeof mouse.scrollDown === "function") await mouse.scrollDown(vertical);
      if (dy > 0 && typeof mouse.scrollUp === "function") await mouse.scrollUp(vertical);
      if (dx < 0 && typeof mouse.scrollLeft === "function") await mouse.scrollLeft(horizontal);
      if (dx > 0 && typeof mouse.scrollRight === "function") await mouse.scrollRight(horizontal);
    },

    async typeText(text) {
      if (keyboard && typeof keyboard.type === "function") {
        return keyboard.type(String(text));
      }
      throw createError("keyboardUnavailable", language);
    },

    async screenshot() {
      if (!screen || typeof screen.capture !== "function") {
        throw createError("screenshotUnavailable", language);
      }

      return captureScreen(screen, nut, language);
    }
  };
}

function getBackend(options = {}) {
  if (options.automation) return options.automation;
  if (!cached) cached = createNutBackend(options.language);
  return cached;
}

module.exports = {
  getBackend,
  createNutBackend,
  normalizeScreenshotResult,
  captureScreen
};
