const EventEmitter = require('events').EventEmitter;
const SerialPort = require('serialport');
const logger = require('winston');

module.exports = class Motors extends EventEmitter {
  constructor(config) {
    super();
    this.name = 'Motors';
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

    // Initialize the status object
    // Note: battery status has an extra field for voltage value
    this.status = {
      parsing: { statusBit: 0, code: 0, success: 'Good parsing', failure: 'Bad parsing' },
      speed: { statusBit: 1, code: 0, success: 'Speed in bounds', failure: 'Speed out of bounds' },
      heartbeat: { statusBit: 2, code: 0, success: 'Heartbeat ok', failure: 'Heartbeat missing' },
      power: { statusBit: 3, code: 0, success: 'Power ok', failure: 'Max power reached' },
      battery: { statusBit: 4, code: 0, voltage: 0, success: 'Battery ok', failure: 'Low battery' },
      charging: { statusBit: 5, code: 0, success: 'Not charging', failure: 'Is charging' },
    };

    // When data is received from the motor controller, call to update status will update
    // the internal status object and emit a status event with the parsed status information
    parser.on('data', (data) => {
      try {
        const status = JSON.parse(data);
        if (status.length === 2) this.updateStatus(status[0], status[1]);
      } catch (err) {
        logger.error(`[${this.name}] ${err.message}`);
        this.emit('error', { message: 'Error parsing status message' });
      }
    });
  }

  updateStatus(statusByte, voltage) {
    // Iterate over status entries to update each one with the new status byte
    Object.values(this.status).forEach((item) => {
      item.code = (statusByte >> item.statusBit) & 1; // eslint-disable-line no-bitwise
    });
    // Provided the battery status item still exists, update its voltage value
    if (this.status.battery) this.status.battery.voltage = voltage;
    // Emit the updated status
    this.emit('status', this.status);
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

  mock() {
    setInterval(() => {
      this.updateStatus(Math.floor(Math.random() * 6), Math.floor(Math.random() * 13) + 30);
    }, 2000);
  }
};
