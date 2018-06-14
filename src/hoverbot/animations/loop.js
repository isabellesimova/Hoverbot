// Animation: Loop
// Description: A number of leds, specified by width, loop around in a chasing pattern

const Animation = require('./animation.js');
const logger = require('winston');

module.exports = class Loop extends Animation {
  constructor(config) {
    super('loop', config);

    // Extend and override base defaults
    this._default = {
      ...this._default,
      ...{ interval: 30, maxInterval: 150 },
      ...{ width: 10 },
    };
    // Apply new default values to starting config
    this._config = this._default;

    // Init animation state values
    this._head = 0;
    this._tail = -this._config.width;
  }

  // Apply config values if provided (uses defaults otherwise)
  configure(data) {
    super.configure(data);
    this.width = data.width;
    this.reset();
  }

  // Reset animation to starting state
  reset() {
    this._head = 0;
    this._tail = -this._config.width;
  }

  set width(value) {
    // Reset to default
    this._config.width = this._default.width;
    // If undefined, return
    if (!value) return;
    // If value in range update the config, else log out of range error
    if (value > 0 && value < this._config.numLeds) this._config.width = value;
    else logger.error(`[${this._config.name}] Width value (${value}) out of range, using default`);
  }

  update() {
    this._head += 1;
    this._tail += 1;
    if (this._head >= this._config.numLeds) this._head = 0;
    if (this._tail >= this._config.numLeds) this._tail = 0;
    this.emit('setPixel', this._head, this._config.color, this._config.brightness);
    this.emit('setPixel', this._tail, '000000', 0);
  }
};
