const animations = require('./animations.json');
const Hoverbot = require('./hoverbot/hoverbot.js');
const logger = require('winston');

// Initialize the robot, give it a name
const robot = new Hoverbot('My Custom Hoverbot', {
  motors: { baudRate: 9600 },
  lightring: { numLeds: 55 },
  idleAnimation: animations.idle,
});

// Some additional variables for teleop
robot.TELEOP_TIMEOUT = 5000;
robot.lastTeleopTimestamp = 0;

// Define callback for handling a new client connection
robot.onClientConnected = () => {
  const response = {
    topic: 'connection',
    timestamp: Date.now(),
    data: {
      teleop: false,
      name: robot.name,
      hasAudio: true,
    },
  };
  robot.lastTeleopTimestamp = Date.now();
  robot.animate({
    name: 'connection',
    timeout: 1500,
    transitions: [],
    lightring: animations.connection,
  });
  return response;
};

// Listen for spi to emit sonar data, relay data via broadcast for the server to send to the client
robot.spi.on('sonar', (data) => {
  robot.broadcast('sonar', data);
});

// Listen for motors to emit status, relay data via broadcast for the server to send to the client
robot.motors.on('status', (data) => {
  robot.broadcast('motors', data);
});

// Handle any robot errors and play a warning lightring animation
robot.on('error', (err) => {
  logger.error(err);
  robot.animate({
    name: 'error',
    timeout: 3000,
    transitions: [],
    lightring: animations.error,
  });
});

// Handle the custom lightring state request from the UI
robot.on('lightring_custom', (data) => {
  if ('state' in data) {
    robot.animate({
      name: 'lightring_custom',
      timeout: 6000,
      transitions: ['lightring_custom', 'dpad', 'error'],
      lightring: data.state.lightring,
    });
  }
});

// Handle the lightring switch request from the UI
robot.on('lightring_switch', (data) => {
  if ('status' in data) {
    robot.lightring.toggle(data.status);
  }
});

// Handle the tts event from the UI
robot.on('tts', (data) => {
  if ('tts' in data) {
    robot.audio.tts(data.tts);
  }
});

// Parse stop command
// Only play the animation until the teleop timeout is reached
robot.on('stop', () => {
  robot.motors.stop();
  if (Date.now() - robot.lastTeleopTimestamp < robot.TELEOP_TIMEOUT) {
    robot.animate({
      name: 'stop',
      timeout: 750,
      transitions: ['*', 'dpad'],
      lightring: animations.stop,
    });
  }
});

// Parse dpad command and move the robot motors
robot.on('dpad', (data, timestamp, delay) => {
  if (delay > robot.maxMessageDelay) {
    logger.info(`Teleop message delay too large: ${delay} > ${robot.maxMessageDelay} ms`);
    robot.broadcast('warning', { message: 'Teleop command too old', delay, maxDelay: robot.maxMessageDelay });
    return;
  }
  robot.lastTeleopTimestamp = Date.now();
  if ('speed' in data && 'ArrowLeft' in data && 'ArrowRight' in data && 'ArrowUp' in data && 'ArrowDown' in data) {
    let driveValues = [0, 0];
    if (data.ArrowUp) {
      driveValues = [-data.speed, -data.speed];
      if (data.ArrowLeft) {
        driveValues[0] = 0;
      } else if (data.ArrowRight) {
        driveValues[1] = 0;
      }
    } else if (data.ArrowDown) {
      driveValues = [data.speed, data.speed];
      if (data.ArrowLeft) {
        driveValues[1] = 0;
      } else if (data.ArrowRight) {
        driveValues[0] = 0;
      }
    } else if (data.ArrowRight) {
      driveValues = [-data.speed, data.speed];
    } else if (data.ArrowLeft) {
      driveValues = [data.speed, -data.speed];
    }
    robot.motors.move(driveValues[0], driveValues[1]);
    robot.animate({
      name: 'dpad',
      timeout: 500,
      transitions: ['stop'],
      lightring: animations.drive,
    });
  } else {
    logger.error('Dpad command missing required field(s)');
  }
});

module.exports = robot;
