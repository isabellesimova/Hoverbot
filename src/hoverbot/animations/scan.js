// Animation: Scan
// Description: A number of leds specified by the variable size will "move" back and forth
//              between the indices specified by variables start and end
// TODO: There's a bug that causes a pause on either end

const Animation = require('./animation.js');
const logger = require('winston');

module.exports = class Scan extends Animation {
  constructor(config) {
    super('scan', config);

    // Extend and override base defaults
    this._default = {
      ...this._default,
      ...{ interval: 80, maxInterval: 150 },
      ...{ width: 5, startIndex: 0, endIndex: 10 },
    };
    // Apply new default values to starting config
    this._config = this._default;

    // Init animation state
    this._dir = 1;
    this._head = this._config.startIndex + this._config.width;
    this._tail = this._config.startIndex;
  }

  // Apply config values if provided (uses defaults otherwise)
  configure(data) {
    super.configure(data);
    this.width = data.width;
    this.startIndex = data.startIndex;
    this.endIndex = data.endIndex;
    this.reset();
  }

  // Reset animation to starting state
  reset() {
    this._dir = 1;
    this._head = this._config.startIndex + this._config.width;
    this._tail = this._config.startIndex;
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

  set startIndex(value) {
    // Reset to default
    this._config.startIndex = this._default.startIndex;
    // If undefined, return
    if (!value) return;
    // If value in range update the config, else log out of range error
    if (value >= 0 && value < this._config.numLeds) this._config.startIndex = value;
    else logger.error(`[${this._config.name}] Start index (${value}) out of range, using default`);
  }

  set endIndex(value) {
    // Reset to default
    this._config.endIndex = this._default.endIndex;
    // If undefined, return
    if (!value) return;
    // If value in range update the config, else log out of range error
    if (value >= 0 && value < this._config.numLeds) this._config.endIndex = value;
    else logger.error(`[${this._config.name}] End index (${value}) out of range, using default`);
  }

  update() {
    // Increment/decrement head and tail for this
    this._head += this._dir;
    this._tail += this._dir;

    if (this._dir === 1) {
      // Handle led index boundary case
      if (this._head >= this._config.numLeds) this._head = 0;
      if (this._tail >= this._config.numLeds) this._tail = 0;
      // Handle end index case
      if (this._head === this._config.endIndex) {
        this._head = this._config.endIndex - this._config.width;
        this._tail = this._config.endIndex;
        this._dir = -1; // Flip the direction
      }
    } else {
      // Handle led index boundary case
      if (this._head < 0) this._head = this._config.numLeds - 1;
      if (this._tail < 0) this._tail = this._config.numLeds - 1;
      // Handle start index case
      if (this._head === this._config.startIndex) {
        this._head = this._config.startIndex + this._config.width;
        this._tail = this._config.startIndex;
        this._dir = 1; // Flip the direction
      }
    }

    // Update the LEDs
    this.emit('setPixel', this._head, this._config.color, this._config.brightness);
    this.emit('setPixel', this._tail, '000000', 0);
  }
};
