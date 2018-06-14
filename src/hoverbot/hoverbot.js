const Audio = require('./audio.js');
const EventEmitter = require('events').EventEmitter;
const LightRing = require('./lightring.js');
const logger = require('winston');
const Motors = require('./motors.js');
const SPI = require('./spi.js');

module.exports = class Hoverbot extends EventEmitter {
  constructor(name, config) {
    super();
    this.name = name;

    // Init motor controller, which sends motor commands and receives motor status updates
    const motorsConfig = config.motors || {};
    this.motors = new Motors(motorsConfig);

    // Init SPI interface, which sends led strip commands and reads sonar data
    const spiConfig = config.spi || {};
    this.spi = new SPI(spiConfig);

    // Init audio interface
    this.audio = new Audio();

    // Init lightring animation logic
    const lightringConfig = config.lightring || {};
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
  }

  // handleMessage: Parse messages, check for required properties, emit event on specified topic
  handleMessage(message) {
    try {
      const json = JSON.parse(message);
      if (json.topic && json.timestamp && json.data) {
        this.emit(json.topic, json.data, json.timestamp);
      } else {
        logger.debug('[Hoverbot] Message missing required field (topic, timestamp, or data)');
      }
    } catch (err) {
      logger.error(`[Hoverbot] Error handling message: ${err}\n Message: ${message}`);
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
    logger.debug('[Hoverbot] Shutting down...');
    logger.debug('[Hoverbot] Stop motors');
    this.motors.stop();
    logger.debug('[Hoverbot] Clear led strip pixels');
    this.spi.clearPixels();
  }

  mock() {
    logger.info('[Hoverbot] Running mock data producers');
    this.motors.mock();
    this.spi.mock();
  }
};
