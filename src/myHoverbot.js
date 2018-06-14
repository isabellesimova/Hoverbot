const animations = require('./animations.json');
const Hoverbot = require('./hoverbot/hoverbot.js');
const logger = require('winston');

// Initialize the hoverbot
const hoverbot = new Hoverbot('My Custom Hoverbot', {
  motors: { baudRate: 9600 },
  lightring: { numLeds: 56, maxBrightness: 25 },
});

hoverbot.lightring.animate(animations.start);

// Define callback for handling a new client connection
hoverbot.onClientConnected = () => {
  const response = {
    topic: 'connection',
    timestamp: Date.now(),
    data: {
      teleop: false,
      name: hoverbot.name,
      hasAudio: false,
      lightringConfig: hoverbot.lightring.config,
    },
  };
  hoverbot.lightring.animate(animations.connection);
  return response;
};

// Handle stop command
hoverbot.on('stop', () => {
  hoverbot.motors.stop();
  hoverbot.lightring.animate(animations.stop);
});

// Parse dpad command and move the hoverbot motors
hoverbot.on('dpad', (data) => {
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
    hoverbot.motors.move(driveValues[0], driveValues[1]);
    hoverbot.lightring.animate(animations.drive);
  } else {
    logger.error('Dpad command missing required field(s)');
  }
});

// Handle the tts event from the UI
hoverbot.on('tts', (data) => {
  if (data.tts) hoverbot.audio.tts(data.tts);
});

// Handle the custom lightring state request from the UI
hoverbot.on('lightring_custom', (data) => {
  if (data.animation) hoverbot.lightring.animate(data.animation);
});

// Handle the lightring switch request from the UI
hoverbot.on('lightring_switch', (data) => {
  if (data.enabled) hoverbot.lightring.enable();
  else if (typeof data.enabled === 'boolean' && !data.enabled) hoverbot.lightring.disable();
});

// Handle any hoverbot errors and play a warning lightring animation
hoverbot.on('error', (err) => {
  logger.error(err);
  hoverbot.lightring.animate(animations.error);
});

// Listen for spi to emit sonar data, relay data via broadcast for the server to send to the client
hoverbot.spi.on('sonar', (data) => {
  hoverbot.broadcast('sonar', data);
});

// Listen for motors to emit status, relay data via broadcast for the server to send to the client
hoverbot.motors.on('status', (data) => {
  hoverbot.broadcast('motors', data);
});

module.exports = hoverbot;
