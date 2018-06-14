const EventEmitter = require('events').EventEmitter;
const SPI = require('pi-spi');
const hexToBinary = require('hex-to-binary');
const logger = require('winston');

module.exports = class spiInterface extends EventEmitter {
  constructor(config) {
    super();
    this.name = 'SPI';
    // Use optional config parameters if provided, otherwise use defaults
    this.sonarInterval = config.sonarInterval ? config.sonarInterval : 300;
    // Initialize
    this.hasSPI = true;
    try {
      this.spi = SPI.initialize('/dev/spidev0.1');
      this.spi.clockSpeed(25000);
    } catch (err) {
      logger.error(`[${this.name}] ${err.message}`);
      this.hasSPI = false;
    }
    this.sonarHeader = '11111111111111111111111111111100000000000000';
    this.sonarRe = /0+/;

    this.ledOrderBGR = true;
    this.ledStartEndFrame = Buffer.from('00000000', 'hex');
    this.ledBrightness = Buffer.from('e1', 'hex');
    this.ledColor = Buffer.from('000000', 'hex');
    this.ledNumPixels = 59;
    this.ledMsgArray = [];
    this.ledMsgArray[0] = this.ledStartEndFrame;
    for (let i = 1; i < (this.ledNumPixels * 2); i += 2) {
      this.ledMsgArray[i] = this.ledBrightness;
      this.ledMsgArray[i + 1] = this.ledColor;
    }
    this.ledMsgArray.push(this.ledStartEndFrame);

    // Clear the pixels to start
    this.clearPixels();

    // Launch the sonar data read loop
    if (!this.hasSPI) return;
    setInterval(() => {
      this.sonarPromise().then((result) => {
        this.parseSonarMsg(result);
      }, (err) => {
        logger.error(`[${this.name}] ${err.message}`);
      });
    }, this.sonarInterval);
  }

  sonarPromise() {
    if (this.hasSPI) {
      this.spi.clockSpeed(25000);
    }
    return new Promise((resolve, reject) => {
      this.spi.read(200, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(hexToBinary(data.toString('hex')));
        }
      });
    });
  }

  parseSonarMsg(msg) {
    // Get just one message out of the data
    const sMsg = msg.substring(msg.indexOf(this.sonarHeader), msg.indexOf(this.sonarHeader) + 320);
    // Split string of ones and zeros to an array of ones
    const onesArray = sMsg.split(this.sonarRe);
    let snrA = '';
    let snrB = '';
    let snrC = '';
    let snrD = '';
    // TODO: Clean this up.
    onesArray.slice(2, 10).forEach((ones) => {
      if (ones === '11111' || ones === '111111') snrA += '1';
      else snrA += '0';
    });
    onesArray.slice(10, 18).forEach((ones) => {
      if (ones === '11111' || ones === '111111') snrD += '1';
      else snrD += '0';
    });
    onesArray.slice(18, 26).forEach((ones) => {
      if (ones === '11111' || ones === '111111') snrC += '1';
      else snrC += '0';
    });
    onesArray.slice(26, 34).forEach((ones) => {
      if (ones === '11111' || ones === '111111') snrB += '1';
      else snrB += '0';
    });
    const data = {
      left: parseInt(snrA, 2),
      center: parseInt(snrB, 2),
      right: parseInt(snrC, 2),
      rear: parseInt(snrD, 2),
    };
    this.emit('sonar', data);
  }

  mock() {
    setInterval(() => {
      const data = {
        left: Math.floor(Math.random() * 30),
        center: Math.floor(Math.random() * 30),
        right: Math.floor(Math.random() * 30),
        rear: Math.floor(Math.random() * 30),
      };
      this.emit('sonar', data);
    }, 2000);
  }

  // Helper function to convert brightness values (0-100) to valid SPI values (e0-ff)
  // TODO: Refactor this out
  getBrightness(brightness) {
    const min = 224;
    const max = 255;
    const num = Math.round(min + ((max - min) * (brightness / 100)));
    const hex = num.toString(16);
    return hex;
  }

  // Helper function to swap the order of string formatted HEX for color values
  rgb2bgr(rgb) {
    const bgr = rgb.match(/.{2}/g).reverse().join('');
    return bgr;
  }

  setAllPixels(color, brightness) {
    // set all leds (brightness min e0, max ff)
    if (!this.hasSPI) { return; }
    this.spi.clockSpeed(900000);
    let tempColor = color;
    if (this.ledOrderBGR) { tempColor = this.rgb2bgr(tempColor); }
    const ledColor = Buffer.from(tempColor, 'hex');
    const ledBrightness = Buffer.from(this.getBrightness(brightness), 'hex');
    for (let i = 1; i < (this.ledNumPixels * 2); i += 2) {
      this.ledMsgArray[i] = ledBrightness;
      this.ledMsgArray[i + 1] = ledColor;
    }
    const ledMsg = Buffer.concat(this.ledMsgArray);
    this.spi.write(ledMsg, (err) => {
      if (err) {
        logger.error(`[${this.name}] ${err.message}`);
      }
    });
  }

  clearPixels() {
    // All pixels off
    this.setAllPixels('000000', 0);
  }

  setPixel(index, color, brightness) {
    // Set individual leds (brightness min e0, max ff)
    if (!this.hasSPI) { return; }
    this.spi.clockSpeed(900000);
    let tempColor = color;
    if (this.ledOrderBGR) { tempColor = this.rgb2bgr(tempColor); }
    const ledColor = Buffer.from(tempColor, 'hex');
    const ledBrightness = Buffer.from(this.getBrightness(brightness), 'hex');
    this.ledMsgArray[(index * 2) + 1] = ledBrightness;
    this.ledMsgArray[(index * 2) + 2] = ledColor;
    const ledMsg = Buffer.concat(this.ledMsgArray);
    this.spi.write(ledMsg, (err) => {
      if (err) {
        logger.error(`[${this.name}] ${err.message}`);
      }
    });
  }
};
