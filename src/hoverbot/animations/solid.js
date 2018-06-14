// Animation: Solid
// Description: All leds display a single, solid color

const Animation = require('./animation.js');

module.exports = class Solid extends Animation {
  constructor(config) {
    super('solid', config);

    // Extend and override base defaults
    // Overrides base flag for animate because solid is a static animation
    this._default = {
      ...this._default,
      ...{ animate: false },
    };
    // Apply new default values to starting config
    this._config = this._default;
  }

  update() {
    this.emit('setAllPixels', this._config.color, this._config.brightness);
  }
};
