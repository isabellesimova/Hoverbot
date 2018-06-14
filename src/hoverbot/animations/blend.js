// Animation: Blend
// Description: All leds cross fade at a specified rate between 2 specified colors
// TODO: Refactor the color blending math and ugly helper functions

const Animation = require('./animation.js');
const logger = require('winston');

module.exports = class Blend extends Animation {
  constructor(config) {
    super('blend', config);

    // Extend and override base defaults
    this._default = {
      ...this._default,
      ...{ maxInterval: 500 },
      ...{ secondColor: '000000' },
    };
    // Apply new default values to starting config
    this._config = this._default;

    // Variables for animation state
    this._forward = true;
    this._steps = 100;
    this._index = 0;
  }

  // Apply config values if provided (uses defaults otherwise)
  configure(data) {
    super.configure(data);
    this.secondColor = data.secondColor;
    this.reset();
  }

  // Reset animation to starting state
  reset() {
    this._forward = true;
    this._steps = 100;
    this._index = 0;
  }

  set secondColor(value) {
    // Reset to default
    this._config.secondColor = this._default.secondColor;
    // If undefined, return
    if (!value) return;
    // Ensure color value is a valid hex string, else log format error
    if (/^[0-9A-F]{6}$/i.test(value)) this._config.secondColor = value;
    else logger.error(`[${this._config.name}] Invalid hex color value or format (${value})`);
  }

  hexToRgb(hex) {
    const color = `#${hex}`;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    const jsonRGB = {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
    return jsonRGB;
  }

  toHex(num) {
    let n = parseInt(num, 10);
    if (Number.isNaN(n)) return '00';
    n = Math.max(0, Math.min(n, 255));
    return '0123456789ABCDEF'.charAt((n - (n % 16)) / 16) + '0123456789ABCDEF'.charAt(n % 16);
  }

  rgbToHex(r, g, b) {
    return this.toHex(r) + this.toHex(g) + this.toHex(b);
  }

  mix(a, b) {
    return ((a * (this._steps - this._index)) + (b * this._index)) / this._steps;
  }

  update() {
    // Blend color
    const colorA = this.hexToRgb(this._config.color);
    const colorB = this.hexToRgb(this._config.secondColor);
    const red = this.mix(colorA.r, colorB.r);
    const green = this.mix(colorA.g, colorB.g);
    const blue = this.mix(colorA.b, colorB.b);
    const hex = this.rgbToHex(red, green, blue);

    // Request update leds
    this.emit('setAllPixels', hex, this._config.brightness);

    // Update indices
    if (this._forward) {
      this._index += 1;
      if (this._index >= this._steps) this._forward = false;
    } else {
      this._index -= 1;
      if (this._index <= 0) this._forward = true;
    }
  }
};
