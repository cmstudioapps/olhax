const { createError } = require("../i18n");
const sharp = require("sharp");

let cached;

function buttonValue(nut, button = "left") {
  const key = String(button).toLowerCase();
  const Button = nut.Button || {};
  if (key === "right") return Button.RIGHT || Button.Right || Button.right || 2;
  if (key === "middle") return Button.MIDDLE || Button.Middle || Button.middle || 1;
  return Button.LEFT || Button.Left || Button.left || 0;
}

function createNutBackend(language) {
  let nut;
  try {
    nut = require("@nut-tree-fork/nut-js");
  } catch (error) {
    throw createError("automationUnavailable", language, { cause: error });
  }

  const { mouse, Point, screen } = nut;
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

    async screenshot() {
      if (!screen || typeof screen.capture !== "function") {
        throw createError("screenshotUnavailable", language);
      }

      const image = await screen.capture();
      if (Buffer.isBuffer(image)) return image;
      if (image && Buffer.isBuffer(image.data) && image.width && image.height) {
        return sharp(image.data, {
          raw: {
            width: image.width,
            height: image.height,
            channels: image.channels || 4
          }
        }).png().toBuffer();
      }
      if (image && Buffer.isBuffer(image.data)) return image.data;
      if (image && typeof image.toRGB === "function") {
        const rgb = await image.toRGB();
        if (rgb && Buffer.isBuffer(rgb.data) && rgb.width && rgb.height) {
          return sharp(rgb.data, {
            raw: {
              width: rgb.width,
              height: rgb.height,
              channels: rgb.channels || 3
            }
          }).png().toBuffer();
        }
        return rgb.data || rgb;
      }

      throw createError("screenshotUnavailable", language);
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
  createNutBackend
};
