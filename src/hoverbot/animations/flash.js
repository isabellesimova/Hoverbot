// Animation: Flash
// Description: All leds flash on and this.OFF in specified color at specified interval

const Animation = require('./animation.js');

module.exports = class Flash extends Animation {
  constructor(config) {
    super('flash', config);

    // Extend and override base defaults
    this._default = {
      ...this._default,
      ...{ interval: 1000, minInterval: 100 },
    };
    // Apply new default values to starting config
    this._config = this._default;

    // Init animation state
    this._on = true;
  }

  configure(data) {
    super.configure(data);
    this.reset();
  }

  // Reset starting state
  reset() {
    this._on = true;
  }

  update() {
    if (this._on) {
      this.emit('setAllPixels', this._config.color, this._config.brightness);
    } else {
      this.emit('clear');
    }
    this._on = !this._on;
  }
};
