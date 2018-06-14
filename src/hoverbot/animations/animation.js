// Animation base class for light ring animations

const EventEmitter = require('events').EventEmitter;
const logger = require('winston');

module.exports = class Animation extends EventEmitter {
  constructor(name, config) {
    super();

    // Shared base class constants
    this.MIN_BRIGHTNESS = 0;
    this.MAX_BRIGHTNESS = 100;
    this.MIN_TIMEOUT = 0;
    this.MAX_TIMEOUT = 20000;

    // Default configuration values
    // Most animations use the following parameters (though some are unused)
    // Some animations extend these parameters
    // (TODO add more descriptions for each one)
    // animate: true by default, set to false for static animations (e.g. solid)
    this._default = {
      name,
      label: 'default',
      timeout: 3000,
      transitions: ['*'],
      animate: true,
      numLeds: 0,
      minInterval: 5,
      maxInterval: 2000,
      maxBrightness: 25,
      color: 'FFFFFF',
      brightness: 15,
      interval: 100,
    };

    // Apply constructor configuration parameters
    // These values are only set here and should not be reconfigured later
    this.numLeds = config.numLeds;
    this.maxBrightness = config.maxBrightness;

    // Init starting config with default values
    this._config = this._default;
  }

  // Apply new animation configuration
  configure(data) {
    this.label = data.label;
    this.timeout = data.timeout;
    this.transitions = data.transitions;
    this.brightness = data.brightness;
    this.color = data.color;
    this.interval = data.interval;
  }

  // Return the default configuration for this animation
  get default() {
    return this._default;
  }

  // Return the current configuration for this animation
  get config() {
    return this._config;
  }

  get label() {
    return this._config.label;
  }

  // Return the current animation name
  get name() {
    return this._config.name;
  }

  set numLeds(value) {
    // Ensure numLeds that it is a positive integer, otherwise unchanged
    if (value > 0 && value === parseInt(value, 10)) {
      this._default.numLeds = value;
    }
  }

  set maxBrightness(value) {
    // Ensure maximum brightness is betwee 0 and 100, otherwise unchanged
    if (this.MIN_BRIGHTNESS <= value && value <= this.MAX_BRIGHTNESS) {
      this._default.maxBrightness = value;
    }
  }

  set label(value) {
    // Reset to default
    this._config.label = this._default.label;
    // If undefined, return
    if (!value) return;
    this._config.label = value;
  }

  set timeout(value) {
    // Reset to default
    this._config.timeout = this._default.timeout;
    // If undefined, return
    if (!value) return;
    if (this.MIN_TIMEOUT <= value && value <= this.MAX_TIMEOUT) {
      this._config.timeout = value;
    } else {
      logger.error(`[${this._config.name}] Timeout value (${value} ms) out of range`);
    }
  }

  set transitions(value) {
    // Reset to default
    this._config.transitions = this._default.transitions;
    // If undefined, return
    if (!value) return;
    if (Array.isArray(value)) this._config.transitions = value;
    else logger.error(`[${this._config.name}] Transition list must be an array`);
  }

  set interval(value) {
    // Reset to default
    this._config.interval = this._default.interval;
    // If undefined, return
    if (!value) return;
    // If value in range update the config, else log out of range error
    if (this._default.minInterval <= value && value <= this._default.maxInterval) {
      this._config.interval = value;
    } else {
      logger.error(`[${this._config.name}] Interval value (${value} ms) out of range`);
    }
  }

  set brightness(value) {
    // Reset to default
    this._config.brightness = this._default.brightness;
    // If undefined, return
    if (!value) return;
    // If value in range update the config, else log out of range error
    if (this.MIN_BRIGHTNESS <= value && value <= this._default.maxBrightness) {
      this._config.brightness = value;
    } else {
      logger.error(`[${this._config.name}] Brightness value (${value}) out of range`);
    }
  }

  set color(value) {
    // Reset to default
    this._config.color = this._default.color;
    // If undefined, return
    if (!value) return;
    // Ensure color value is a valid hex string, else log format error
    if (/^[0-9A-F]{6}$/i.test(value)) this._config.color = value;
    else logger.error(`[${this._config.name}] Invalid hex color value or format (${value})`);
  }

  // Check requested next label against valid transition list of current animation
  // The * in the transition list allows transitions to any other label, excluding itself
  // To allow a transition to itself it must added to transition list
  hasTransition(label) {
    if (this._config.transitions.includes('*') && label !== this._config.label) return true;
    else if (this._config.transitions.includes(label)) return true;
    return false;
  }

  // Play the animation
  play(config) {
    // Set the provided configuration
    this.configure(config);
    // Execute the first animation update
    this.update();
    // If animate, play animation loop
    if (this._config.animate) {
      this._loop = setInterval(() => {
        this.update();
      }, this._config.interval);
    }
    // Set timeout for animation timeout event
    this._timeout = setTimeout(() => {
      this.stop();
      this.emit('timeout');
    }, this._config.timeout);
  }

  // Stop the animation loop
  stop() {
    clearInterval(this._loop);
    clearTimeout(this._timeout);
  }

  // Refreshes the animation timeout
  refresh() {
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      this.stop();
      this.emit('timeout');
    }, this._config.timeout);
  }
};
