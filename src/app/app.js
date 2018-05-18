new Vue({ // eslint-disable-line no-new
  el: '#app',
  data() {
    return {
      connected: false,
      ws: null,
      name: '',
      heartbeatInterval: 450,
      heartbeat: {
        topic: 'stop',
        data: {},
      },
      audioStream: {
        active: false,
      },
      audioSrc: '/stream.wav',
      cameraSrc: `http://${window.location.hostname}:8080/`,
      message: {},
      teleop: false,
      connectionResponse: false,
      proximityData: {},
      motorData: {},
      style: {
        fontFamily: ['Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    };
  },
  created() {
    // Initialize client <-> robot websocket
    this.ws = new WebSocket(`ws://${window.location.host}`);
    this.ws.onopen = () => {
      this.connected = true;
    };
    this.ws.onclose = () => {
      this.connected = false;
    };
    this.ws.onmessage = (event) => {
      try {
        this.message = JSON.parse(event.data);
        const topic = this.message.topic;
        const data = this.message.data;
        if (topic === 'sonar') {
          this.proximityData = data;
        }
        if (topic === 'motors') {
          this.motorData = data;
        }
        if (topic === 'connection') {
          this.connectionResponse = true;
          if ('teleop' in data) {
            this.teleop = data.teleop;
          }
          if ('name' in data) {
            this.name = data.name;
            document.title = this.name;
          }
          if ('hasAudio' in data) {
            this.audioStream.active = data.hasAudio;
          }
        }
      } catch (e) {
        // Catch bad JSON formatting errors and log to console for debugging
        console.error(e); // eslint-disable-line no-console
      }
    };
    // Start client <-> robot hearbeat loop
    setInterval(() => {
      if (this.connected) {
        this.send(this.heartbeat.topic, this.heartbeat.data);
      }
    }, this.heartbeatInterval);
  },
  methods: {
    drive(topic, data) {
      this.heartbeat = { topic, data };
      this.send(topic, data);
    },
    send(topic, data) {
      if (this.ws.readyState === this.ws.OPEN) {
        const msg = {};
        msg.topic = topic;
        msg.timestamp = Date.now();
        msg.data = data;
        this.ws.send(JSON.stringify(msg));
      }
    },
  },
});
