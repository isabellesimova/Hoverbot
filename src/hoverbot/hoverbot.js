const EventEmitter = require('events').EventEmitter;
const MotorController = require('./motorcontroller.js');
const SPI = require('./spi.js');
const LightRing = require('./lightring.js');
const Audio = require('./audio.js');
const logger = require('winston');

module.exports = class Hoverbot extends EventEmitter {
  constructor(name, config) {
    super();
    this.name = name;
    this.asleep = false;
    this.lastUpdate = 0;

    // Use optional config parameters if provided, otherwise use defaults
    this.maxMessageDelay = config.maxMessageDelay || 150;
    this.statusInterval = config.statusInterval || 1000;
    const freeTimeout = config.freeTimeout || 500;
    const idleTimeout = config.idleTimeout || 10000;
    const idleAnimation = config.idleAnimation || { animation: 'off' };
    const spiConfig = config.spi || {};
    const motorConfig = config.motors || {};
    const lightringConfig = config.lightring || {};

    // Define internal states and initialize current state
    // FREE is a limbo state
    // - every state will timeout to free state if not interrupted by a valid next state
    //   before the specified timeout
    // - the free state will not change the animation
    // - any state may interrupt the free state
    // - when the free state has reached its timeout, state will transition to the idle state
    // IDLE state
    // - any state may interrupt the idle state
    // - idle state optionally plays an animation until the timeout is reached
    // - when the idle state has reached its timeout, sleep() is executed
    this.FREE = {
      name: 'free', timeout: freeTimeout, transitions: ['*'],
    };
    this.IDLE = {
      name: 'idle', timeout: idleTimeout, transitions: ['*'], lightring: idleAnimation,
    };
    this.state = this.FREE;

    // Init motor controller
    this.motors = new MotorController(motorConfig);

    // Init SPI interface
    this.spi = new SPI(spiConfig);

    // Init lightring interface
    this.lightring = new LightRing(lightringConfig);
    this.lightring.on('clear', () => {
      this.spi.clearPixels();
    });
    this.lightring.on('setAllPixels', (color, brightness) => {
      this.spi.setAllPixels(color, brightness);
    });
    this.lightring.on('setPixel', (index, color, brightness) => {
      this.spi.setPixel(index, color, brightness);
    });
    this.lightring.start();

    // Init audio interface
    this.audio = new Audio();

    // Init state and start the status check loop
    this.statusLoop();
  }

  // sleep: Trigger low power mode for any relevant processes
  sleep() {
    logger.info(`[${this.name}] Start sleep state...`);
    this.asleep = true;
    this.lightring.toggle(false);
    this.emit('sleep');
  }

  // wake: Wake up any relevant processes
  wake() {
    if (!this.asleep) return;
    this.asleep = false;
    this.state = this.FREE;
    this.lightring.toggle(true);
    this.statusLoop();
    this.emit('wake');
  }

  // status: Loop to check for state timeouts, loop exits if asleep
  statusLoop() {
    if (this.asleep) return;
    if (Date.now() - this.lastUpdate > this.state.timeout) {
      // FREE timeout to IDLE
      if (this.state === this.FREE) this.animate(this.IDLE);
      // IDLE timeout to sleep
      else if (this.state === this.IDLE) this.sleep();
      // Any other states timeout to FREE
      else this.animate(this.FREE);
    }
    setTimeout(() => {
      this.statusLoop();
    }, this.statusInterval);
  }

  // parse: Parse incoming messages, check required properties. emit event on specified topic
  parse(message) {
    try {
      const json = JSON.parse(message);
      if ('topic' in json && 'timestamp' in json && 'data' in json) {
        const delay = Date.now() - json.timestamp;
        if (delay > this.maxMessageDelay) {
          // TODO: Add warning level to logger
          logger.info(`[${this.name}] Warning: Message delay exceeds threshold (${delay} ms)`);
        }
        this.emit(json.topic, json.data, json.timestamp, delay);
      } else {
        logger.debug(`[${this.name}] Message missing required field (topic, timestamp, or data)`);
      }
    } catch (err) {
      logger.error(`[${this.name}] ${err}`);
    }
  }

  // isValidTransition: Check requested next state against valid transitions from current state
  isValidTransition(state) {
    // (1) Predefined: IDLE and FREE are predefined states that are always allowed
    if (state === this.IDLE || state === this.FREE) return true;
    // Check for required state properties
    if ('name' in state && 'timeout' in state && 'transitions' in state) {
      // (2) Open state: Allow transition to any other state excluding itself
      if (this.state.transitions.includes('*') && state.name !== this.state.name) return true;
      // (3) Transition list: Valid next states named in list, can include itself
      else if (this.state.transitions.includes(state.name)) return true;
    } else {
      logger.debug(`State missing required property: ${JSON.stringify(state)}`);
    }
    return false;
  }

  // update: Manage animation state updates and transitions and executes any corresponding animation
  animate(state) {
    if (this.asleep) this.wake();
    if (this.isValidTransition(state)) {
      logger.debug(`[${this.name}] Change robot state from: '${this.state.name}' to '${state.name}'`);
      this.state = state;
      this.lastUpdate = Date.now();
      if ('lightring' in state) {
        this.spi.clearPixels();
        this.lightring.config(state.lightring);
      }
    } else if (state.name === this.state.name) {
      this.lastUpdate = Date.now();
    }
  }

  // broadcast: Emit a generic broadcast message packaged with a topic, timestamp and data obj
  broadcast(topic, data) {
    const message = {};
    message.topic = topic;
    message.timestamp = Date.now();
    message.data = data;
    this.emit('broadcast', message);
  }

  // shutdown: Gracefully shutdown the robot, stop the motors and clear the leds
  shutdown() {
    logger.debug(`[${this.name}] Shutting down...`);
    logger.debug(`[${this.name}] Stop motors`);
    this.motors.stop();
    logger.debug(`[${this.name}] Clear pixels`);
    this.spi.clearPixels();
  }

  spoof() {
    logger.info(`[${this.name}] Running spoof data producers`);
    this.motors.spoof();
    this.spi.spoof();
  }
};
