const express = require('express');
const fs = require('fs');
const http = require('http');
const logger = require('winston');
const os = require('os');
const path = require('path');
const spawn = require('child_process').spawn;
const WebSocket = require('ws');

// Require custom hoverbot
const hoverbot = require('./myHoverbot.js');

// Port to serve UI
const PORT = 8000;

// Path to video server executable
const VIDEO_SERVER = path.join(__dirname, 'webcam/build/cat_video');

// Configure logger
const logfile = path.join(__dirname, '../hoverbot.log');
logger.add(logger.transports.File, { filename: logfile });
logger.info(`[Server] Writing logs to ${logfile}`);

// Init app
const app = express();

// Grab and parse any command line args
const args = process.argv.slice(2);
args.forEach((arg) => {
  if (arg === 'mock') {
    hoverbot.mock();
  }
  if (arg in logger.levels) {
    logger.level = arg;
  }
});

// Serve static app files
app.use(express.static(path.join(__dirname, 'app')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'app/index.html'));
});

// Serve audio stream
app.get('/stream.wav', (req, res) => {
  res.set({
    'Content-Type': 'audio/wav',
    'Transfer-Encoding': 'chunked',
  });
  hoverbot.audio.getMicStream().pipe(res);
});

// Init http server
const server = http.createServer(app);
server.listen(PORT, () => {
  logger.info('[Server] Listening on %d', server.address().port);
});

// Launch webcam video server
if (os.platform() === 'linux') {
  if (fs.existsSync(VIDEO_SERVER)) {
    const catVideo = spawn(VIDEO_SERVER);
    catVideo.stdout.on('data', (data) => {
      logger.info(`[Server] Child process ${VIDEO_SERVER} stdout: ${data}`);
    });
    catVideo.stderr.on('data', (data) => {
      logger.error(`[Server] Child process ${VIDEO_SERVER} stderr: ${data}`);
    });
    catVideo.on('close', (code) => {
      logger.info(`[Server] Child process ${VIDEO_SERVER} exited with code ${code}`);
    });
  } else {
    logger.error(`[Server] Video server executable not found: ${VIDEO_SERVER}`);
  }
} else {
  logger.info('[Server] Video streaming currently only supported on linux');
}

// Init websocket server
const wss = new WebSocket.Server({ server });
let connectedClientId = -1;

// Random ticket number generator
function takeTicket() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return `${s4()}${s4()}-${s4()}`;
}

// Websocket server listens for incoming connections and messages (from client)
wss.on('connection', (ws) => {
  ws.accessId = takeTicket(); // eslint-disable-line no-param-reassign

  // Check resource availability and send response
  const response = hoverbot.onClientConnected();
  if (connectedClientId === -1) {
    connectedClientId = ws.accessId;
    response.data.teleop = true;
  }
  logger.debug(`[Server] New client connected, send teleop request reponse: ${JSON.stringify(response)}`);
  ws.send(JSON.stringify(response));

  // Client to server message handling
  ws.on('message', (message) => {
    if (ws.accessId === connectedClientId) {
      logger.debug(`[Server] Handle client message: ${message}`);
      hoverbot.handleMessage(message);
    }
  });

  // Client connection closed
  ws.on('close', () => {
    if (ws.accessId === connectedClientId) {
      logger.debug('[Server] Websocket client disconnected');
      connectedClientId = -1;
    }
  });
});

// Hoverbot broadcast event listener, forwards messages via websocket to clients
hoverbot.on('broadcast', (message) => {
  if (wss.clients.size !== 0) {
    logger.debug(`[Server] Websocket broadcast: ${JSON.stringify(message)}`);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
});

// Graceful shutdown, cleanup any dangling resources
function shutdown() {
  hoverbot.shutdown();
  process.exit(1);
}

process.on('exit', shutdown);
process.on('SIGINT', shutdown);
