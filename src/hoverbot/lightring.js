const EventEmitter = require('events').EventEmitter;
const logger = require('winston');

// Light ring animation base class
class Animation extends EventEmitter {
  constructor(name, numLeds) {
    super();
    this.name = name;
    this.numLeds = numLeds;

    // Define constants
    this.OFF = 0;
    this.BLACK = '000000';
    this.WHITE = 'FFFFFF';
    this.MIN_BRIGHTNESS = 0;
    this.MAX_BRIGHTNESS = 100;
    this.DEFAULT_BRIGHTNESS = 25;
    this.MIN_INTERVAL = 10; // ms
    this.MAX_INTERVAL = 2000; // ms
    this.DEFAULT_INTERVAL = 100; // ms

    // Initialize state to defaults
    // Note: Not all animations use all properties
    this.animate = true;
    this.interval = this.DEFAULT_INTERVAL;
    this.color = this.WHITE;
    this.brightness = this.DEFAULT_BRIGHTNESS;
  }

  setBrightness(brightness) {
    if (brightness >= this.MIN_BRIGHTNESS && brightness <= this.MAX_BRIGHTNESS) {
      this.brightness = brightness;
    } else {
      logger.error(`[${this.name}] Brightness value (${brightness}) out of range`);
    }
  }

  setColor(color) {
    if (/^[0-9A-F]{6}$/i.test(color)) {
      this.color = color;
    } else {
      logger.error(`[${this.name}] Invalid hex color value or format (${color})`);
    }
  }

  setUpdateInterval(interval) {
    if (interval >= this.MIN_INTERVAL && interval <= this.MAX_INTERVAL) {
      this.interval = interval;
    } else {
      logger.error(`[${this.name}] Update interval value (${interval} ms) out of range`);
    }
  }

  config(data) {
    const brightness = 'brightness' in data ? data.brightness : this.DEFAULT_BRIGHTNESS;
    this.setBrightness(brightness);
    const color = 'color' in data ? data.color : this.WHITE;
    this.setColor(color);
    const interval = 'interval' in data ? data.interval : this.DEFAULT_INTERVAL;
    this.setUpdateInterval(interval);
  }

  reset() {
    logger.debug(`[${this.name}] Reset starting state`);
  }
}

// Name: Off
// Description: Turn all leds off
class Off extends Animation {
  constructor(name, numLeds) {
    super(name, numLeds);
    this.animate = false;
  }
  reset() {
    super.reset();
    this.emit('setAllPixels', this.BLACK, this.OFF);
  }
  update() {
    this.emit('setAllPixels', this.BLACK, this.OFF);
  }
}

// Name: Solid
// Description: All leds display a single, solid color
class Solid extends Animation {
  constructor(name, numLeds) {
    super(name, numLeds);
    this.animate = false;
  }
  reset() {
    super.reset();
    this.emit('setAllPixels', this.color, this.brightness);
  }
  update() {
    this.emit('setAllPixels', this.color, this.brightness);
  }
}

// Name: Flash
// Description: All leds flash on and this.OFF in specified color at specified interval
class Flash extends Animation {
  constructor(name, numLeds) {
    super(name, numLeds);
    this.interval = 1000;
    this.on = true;
  }
  reset() {
    super.reset();
    this.on = true;
    this.emit('setAllPixels', this.color, this.brightness);
  }
  update() {
    if (this.on) {
      this.emit('setAllPixels', this.color, this.brightness);
    } else {
      this.emit('clear');
    }
    this.on = !this.on;
  }
}

// Name: Loop
// Description: A number of leds, specified by width, loop around in a chasing pattern
class Loop extends Animation {
  constructor(name, numLeds) {
    super(name, numLeds);
    // Override constant of base class
    this.DEFAULT_INTERVAL = 30;
    // Custom animation constant
    this.DEFAULT_WIDTH = 10;
    // Init starting state
    this.interval = this.DEFAULT_INTERVAL;
    this.width = this.DEFAULT_WIDTH;
    this.head = 0;
    this.tail = -this.width;
  }
  reset() {
    super.reset();
    this.head = 0;
    this.tail = -this.width;
  }
  update() {
    this.head += 1;
    this.tail += 1;
    if (this.head >= this.numLeds) this.head = 0;
    if (this.tail >= this.numLeds) this.tail = 0;
    this.emit('setPixel', this.head, this.color, this.brightness);
    this.emit('setPixel', this.tail, this.BLACK, this.OFF);
  }
  setWidth(width) {
    if (width > 0 && width <= Math.round(this.numLeds / 2)) {
      this.width = width;
    } else {
      logger.error(`[${this.name}] Width value (${width}) out of range`);
    }
  }
  config(data) {
    super.config(data);
    const width = 'width' in data ? data.width : this.DEFAULT_WIDTH;
    this.setWidth(width);
  }
}

// Name: Pulse
// Description: All leds oscillate brightness between the specified maximum and minimum brightness
//              at a speed specified by step and update interval
class Pulse extends Animation {
  constructor(name, numLeds) {
    super(name, numLeds);
    // Override constant of base class
    this.DEFAULT_INTERVAL = 80;
    // Custom animation constant
    this.DEFAULT_STEP = 1;
    // Initialize all parameters to defaults
    this.minBrightness = this.MIN_BRIGHTNESS;
    this.maxBrightness = this.MAX_BRIGHTNESS;
    this.brightness = this.MAX_BRIGHTNESS;
    this.interval = this.DEFAULT_INTERVAL;
    this.color = this.WHITE;
    this.step = this.DEFAULT_STEP;
    this.fadeOut = true;
  }

  setRange(min, max) {
    if (min < max) {
      if (min >= this.MIN_BRIGHTNESS && min < this.MAX_BRIGHTNESS) {
        this.minBrightness = min;
      } else {
        logger.error(`[${this.name}] Minimum brightness value (${min}) out of range`);
      }
      if (max > this.MIN_BRIGHTNESS && max <= this.MAX_BRIGHTNESS) {
        this.maxBrightness = max;
      } else {
        logger.error(`[${this.name}] Maximum brightness value (${max}) out of range`);
      }
    } else {
      logger.error(`[${this.name}] Min brightness (${min}) must be less than max (${max})`);
    }
  }

  setStep(step) {
    if (step > 0 && step <= 10) {
      this.step = step;
    }
  }

  config(data) {
    super.config(data);
    const minBrightness = 'minBrightness' in data ? data.minBrightness : this.MIN_BRIGHTNESS;
    const maxBrightness = 'maxBrightness' in data ? data.maxBrightness : this.MAX_BRIGHTNESS;
    this.setRange(minBrightness, maxBrightness);
    const step = 'step' in data ? data.step : this.DEFAULT_STEP;
    this.setStep(step);
  }

  reset() {
    super.reset();
    this.fadeOut = true;
    this.brightness = this.maxBrightness;
    this.emit('setAllPixels', this.color, this.brightness);
  }

  update() {
    if (this.fadeOut) {
      if ((this.brightness - this.step) < this.minBrightness) {
        this.fadeOut = false;
      } else {
        this.brightness -= this.step;
      }
    } else if ((this.brightness + this.step) > this.maxBrightness) {
      this.fadeOut = true;
    } else {
      this.brightness += this.step;
    }
    this.emit('setAllPixels', this.color, this.brightness);
  }
}

// Name: Scan
// Description: A number of leds specified by the variable size will "move" back and forth
//              between the indices specified by variables start and end
// TODO: There's a bug that causes a pause on either end
class Scan extends Animation {
  constructor(name, numLeds) {
    super(name, numLeds);
    // Override constant of base class
    this.DEFAULT_INTERVAL = 80;
    // Define custom animation constants
    this.DEFAULT_START = 0;
    this.DEFAULT_END = Math.round(numLeds / 2);
    this.DEFAULT_WIDTH = 5;
    // Initialize starting state
    this.interval = this.DEFAULT_INTERVAL;
    this.start = this.DEFAULT_START;
    this.end = this.DEFAULT_END;
    this.width = this.DEFAULT_WIDTH;
    this.dir = 1;
    this.head = 0;
    this.tail = -this.width;
  }

  reset() {
    super.reset();
    this.dir = 1;
    this.head = 0;
    this.tail = -this.width;
  }

  update() {
    // Update
    const offIndex = this.start + this.head + this.tail;
    if (offIndex >= 0 && offIndex < this.numLeds) {
      this.emit('setPixel', offIndex, this.BLACK, this.OFF);
    }
    const onIndex = this.start + this.head;
    if (onIndex >= 0 && onIndex < this.numLeds) {
      this.emit('setPixel', onIndex, this.color, this.brightness);
    }
    // Update index state
    this.head += this.dir;
    if (this.head <= 0 || (this.start + this.head) >= this.end) {
      this.dir = -1 * this.dir;
      this.tail = -1 * this.tail;
    }
  }

  setStartIndex(startIndex) {
    if (startIndex >= 0 && startIndex < this.numLeds) {
      this.start = startIndex;
    } else {
      logger.error(`[${this.name}] Start index (${startIndex}) out of range`);
    }
  }

  setEndIndex(endIndex) {
    if (endIndex >= 0 && endIndex < this.numLeds) {
      this.end = endIndex;
    } else {
      logger.error(`[${this.name}] End index (${endIndex}) out of range`);
    }
  }

  setRange(startIndex, endIndex) {
    if (startIndex < endIndex) {
      this.setStartIndex(startIndex);
      this.setEndIndex(endIndex);
    }
  }

  setWidth(width) {
    if (width > 0 && width <= Math.round(this.numLeds / 2)) {
      this.width = width;
    } else {
      logger.error(`[${this.name}] Width value (${width}) out of range`);
    }
  }

  config(data) {
    super.config(data);
    const width = 'width' in data ? data.width : this.DEFAULT_WIDTH;
    this.setWidth(width);
    const startIndex = 'startIndex' in data ? data.startIndex : this.DEFAULT_START;
    const endIndex = 'endIndex' in data ? data.endIndex : this.DEFAULT_END;
    this.setRange(startIndex, endIndex);
  }
}

// Name: Blend
// Description: All leds cross fade at a specified rate between 2 specified colors
// TODO: Refactor the color blending math and ugly helper functions
class Blend extends Animation {
  constructor(name, numLeds) {
    super(name, numLeds);
    // Custom animation constants
    this.BLUE = '0000FF';
    // Initialize state
    this.secondaryColor = this.BLUE;
    this.forward = true;
    this.steps = 100;
    this.index = 0;
  }

  setSecondaryColor(color) {
    if (/^[0-9A-F]{6}$/i.test(color)) {
      this.secondaryColor = color;
    } else {
      logger.error(`[${this.name}] Invalid hex color value or format for secondary color (${color})`);
    }
  }

  config(data) {
    super.config(data);
    const color = 'secondaryColor' in data ? data.secondaryColor : this.BLUE;
    this.setSecondaryColor(color);
  }

  reset() {
    super.reset();
    this.forward = true;
    this.steps = 100;
    this.index = 0;
  }

  toHex(num) {
    let n = parseInt(num, 10);
    if (Number.isNaN(n)) return '00';
    n = Math.max(0, Math.min(n, 255));
    return '0123456789ABCDEF'.charAt((n - (n % 16)) / 16) + '0123456789ABCDEF'.charAt(n % 16);
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

  rgbToHex(r, g, b) {
    return this.toHex(r) + this.toHex(g) + this.toHex(b);
  }

  mix(a, b) {
    return ((a * (this.steps - this.index)) + (b * this.index)) / this.steps;
  }

  update() {
    // Blend color
    const colorA = this.hexToRgb(this.color);
    const colorB = this.hexToRgb(this.secondaryColor);
    const red = this.mix(colorA.r, colorB.r);
    const green = this.mix(colorA.g, colorB.g);
    const blue = this.mix(colorA.b, colorB.b);
    const hex = this.rgbToHex(red, green, blue);

    // Request update leds
    this.emit('setAllPixels', hex, this.brightness);

    // Update indices
    if (this.forward) {
      this.index += 1;
      if (this.index >= this.steps) this.forward = false;
    } else {
      this.index -= 1;
      if (this.index <= 0) this.forward = true;
    }
  }
}

module.exports = class LightRing extends EventEmitter {
  constructor(config) {
    super();
    this.name = 'LightRing';
    this.enabled = true;

    // Check numLeds
    let numLeds = 1;
    if ('numLeds' in config) {
      if (config.numLeds === parseInt(config.numLeds, 10) && config.numLeds > 0) {
        numLeds = config.numLeds;
      } else {
        logger.error(`[${this.name}] Property 'numLeds' must be a positive integer`);
      }
    } else {
      logger.error(`[${this.name}] Missing property 'numLeds'`);
    }

    // Initialize list of light ring animations
    this.animations = {
      off: new Off('off', numLeds),
      solid: new Solid('solid', numLeds),
      flash: new Flash('flash', numLeds),
      loop: new Loop('loop', numLeds),
      pulse: new Pulse('pulse', numLeds),
      scan: new Scan('scan', numLeds),
      blend: new Blend('blend', numLeds),
    };

    // Initialize starting animation
    this.animation = this.animations.off;

    // Add event listener to all animations to bubble up led events
    Object.keys(this.animations).forEach((key) => {
      const anim = this.animations[key];
      anim.addListener('clear', () => {
        this.emit('clear');
      });
      anim.addListener('setPixel', (index, color, brightness) => {
        this.emit('setPixel', index, color, brightness);
      });
      anim.addListener('setAllPixels', (color, brightness) => {
        this.emit('setAllPixels', color, brightness);
      });
    });
  }

  toggle(status) {
    this.enabled = status;
    if (this.enabled) {
      this.animation.update();
      this.start();
    } else this.emit('clear');
  }

  config(data) {
    if (!('animation' in data)) {
      logger.error(`[${this.name}] No animation type provided (${JSON.stringify(data)})`);
    } else if (this.enabled && data.animation in this.animations) {
      this.animation = this.animations[data.animation];
      this.animation.config(data);
      this.animation.reset();
      this.animation.update();
    } else {
      logger.error(`[${this.name}] No animation defined for '${data.animation}'`);
    }
  }

  // Recursive timeout loop allows interval value to change between updates
  loop() {
    if (!this.enabled) return;
    if (this.animation.animate) {
      this.animation.update();
    }
    setTimeout(() => {
      this.loop();
    }, this.animation.interval);
  }

  // Launch first update
  start() {
    setTimeout(() => {
      this.loop();
    }, this.animation.interval);
  }
};
