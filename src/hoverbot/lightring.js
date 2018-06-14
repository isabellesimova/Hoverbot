// LightRing
// Description: Implement animation loop and animation configurations

const EventEmitter = require('events').EventEmitter;
const logger = require('winston');
const Solid = require('./animations/solid.js');
const Flash = require('./animations/flash.js');
const Loop = require('./animations/loop.js');
const Scan = require('./animations/scan.js');
const Blend = require('./animations/blend.js');

module.exports = class LightRing extends EventEmitter {
  constructor(config) {
    super();
    this._disabled = false;
    this._idle = true;

    // Initialize starting list of available animations
    // For ease of checking that the requested animation exists,
    // the object key here must match the animation name (defined in each animation class)
    this._animations = {
      solid: new Solid(config),
      flash: new Flash(config),
      loop: new Loop(config),
      scan: new Scan(config),
      blend: new Blend(config),
    };
    // Initialize starting animation
    this._animation = this._animations.solid;

    // Add event listener to all animations to bubble up events
    Object.keys(this._animations).forEach((key) => {
      const anim = this._animations[key];
      anim.addListener('timeout', () => {
        this.idle();
      });
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

  get config() {
    const options = {};
    Object.keys(this._animations).forEach((key) => {
      options[key] = this._animations[key].default;
    });
    return options;
  }

  // Set idle flag, stop animation, and clear leds
  idle() {
    this._idle = true;
    this._animation.stop();
    this.emit('clear');
    this.emit('idle');
  }

  // Enable lightring updates
  enable() {
    this._disabled = false;
  }

  // Disable lightring updates and clear leds
  disable() {
    this._disabled = true;
    this._animation.stop();
    this.emit('clear');
  }

  animate(config) {
    // If disabled no updates are allowed
    if (this._disabled) return;
    // If the type of animation exists and it is a valid next animation or the idle flag is set
    if (this._animations[config.name] &&
       (this._idle || this._animation.hasTransition(config.label))) {
      logger.debug(`Change animation to '${config.label}'`);
      // Reset the idle flag to false
      this._idle = false;
      // Stop the current animation, clear the led strip
      this._animation.stop();
      this.emit('clear');
      // Update the active animation
      this._animation = this._animations[config.name];
      // Play the animation using the provided configurations (uses defaults otherwise)
      this._animation.play(config);
    } else if (config.label === this._animation.label) {
      // Otherwise if the current animation is already playing, treat this request as a refresh
      logger.debug(`Refresh timeout for animation '${this._animation.label}'`);
      this._animation.refresh();
    }
  }
};
