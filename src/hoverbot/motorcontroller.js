const EventEmitter = require('events').EventEmitter;
const SerialPort = require('serialport');
const logger = require('winston');

module.exports = class MotorController extends EventEmitter {
  constructor(config) {
    super();
    this.name = 'MotorController';
    this.MAX_SPEED = 240; // Maximum allowed hoverboard motor speed (RPMs)

    // Use optional config parameters if provided, otherwise use defaults
    const port = config.port || '/dev/ttyS0';
    const baudRate = config.baudRate || 9600;

    // Init serial port for motor control
    this.motorPort = new SerialPort(port, { baudRate });
    this.motorPort.on('error', (err) => {
      logger.error(`[${this.name}] ${err.message}`);
    });

    // Listen and parse incoming messages
    const Readline = SerialPort.parsers.Readline;
    const parser = this.motorPort.pipe(new Readline({ delimiter: '\n' }));

    // Parse and bubble up the status from the motor controller
    parser.on('data', (data) => {
      try {
        const temp = JSON.parse(data);
        if (temp.length === 2) {
          const status = {
            status: temp[0],
            voltage: temp[1],
          };
          this.emit('status', status);
        }
      } catch (err) {
        logger.error(`[${this.name}] ${err.message}`);
      }
    });
  }

  stop() {
    this.move(0, 0);
  }

  move(left, right) {
    let l = Math.round(left);
    if (left < -this.MAX_SPEED) l = -this.MAX_SPEED;
    if (left > this.MAX_SPEED) l = this.MAX_SPEED;
    let r = Math.round(right);
    if (right < -this.MAX_SPEED) r = -this.MAX_SPEED;
    if (right > this.MAX_SPEED) r = this.MAX_SPEED;
    const msg = `\nL${l.toString()},R${r.toString()}\n`;
    if (this.motorPort.isOpen) {
      this.motorPort.write(msg);
      logger.debug(`[${this.name}] Drive motors ${msg}`);
    } else {
      logger.debug(`[${this.name}] Motors port is closed.`);
    }
  }

  spoof() {
    setInterval(() => {
      const status = {
        status: Math.floor(Math.random() * 6),
        voltage: Math.floor(Math.random() * 13) + 30,
      };
      this.emit('status', status);
    }, 2000);
  }
};
